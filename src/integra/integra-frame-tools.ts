import * as bitwiseByte from 'bitwise/byte';
import {UInt8} from 'bitwise/types';

export class IntegraFrameTools {

  /**
   * Frame structure
   * <pre>
   *   0xFE|0xFE|cmd|d1|d2|...|dn|crc.high|crc.low|0xFE|0x0D
   *
   * Escaping 0xFE
   *  If any byte of the frame (i.e. cmd, d1, d2, ..., dn, crc.high, crc.low) to be sent is equal 0xFE, the following two bytes must be
   * sent instead of single 0xFE byte: 0xFE, 0xF0. In such case only single 0xFE should be used to update crc.
   *
   */
  static prepareFrame(payload: number[]): number[] {
    const frame: number[] = [];
    frame.push(0xfe);
    frame.push(0xfe);
    for (let w = 0; w < payload.length; w++) {
      frame.push(payload[w]);
      if (payload[w] === 0xfe) {
        // escaping is here
        frame.push(0xf0);
      }
    }
    const checksum = IntegraFrameTools.calculateChecksum(payload);
    frame.push((checksum >> 8) & 0xff);
    if (((checksum >> 8) & 0xff) === 0xfe) {
      frame.push(0xf0);
    }
    frame.push(checksum & 0xff);
    if ((checksum & 0xff) === 0xfe) {
      frame.push(0xf0);
    }
    frame.push(0xfe);
    frame.push(0x0d);
    return frame;
  }

  static checksumValid(frame: number[]): boolean {
    let crcStartPosition = frame.length - 4;
    if (frame[crcStartPosition] === 0xfe) {
      crcStartPosition--;
    }
    if (frame[crcStartPosition - 1] === 0xfe) {
      crcStartPosition--;
    }
    const command = frame.slice(2, crcStartPosition);
    const crc = frame.slice(crcStartPosition);
    const calculatedChecksum = IntegraFrameTools.calculateChecksum(command);
    if ((calculatedChecksum >> 8 & 0xff) !== crc[0]) {
      return false;
    }
    if (crc[0] !== 0xfe && (calculatedChecksum & 0xff) !== crc[1]) {
      return false;
    } else if (crc[0] === 0xfe && (calculatedChecksum & 0xff) !== crc[2]) {
      return false;
    }
    return true;
  }

  static prettyPrintFrame(frame: number[]): string {
    return frame.map((byte) => (`${byte.toString(16)}`.padStart(2, '0')).toUpperCase()).reduce((prev, curr) => `${prev} ${curr}`);
  }

  static frameIsComplete(frame: number[]): boolean {
    return frame[0] === 0xFE && frame[1] === 0xFE && frame[frame.length - 1] === 0x0D && frame[frame.length - 2] === 0xFE;
  }

  /**
   *  "instead of single 0xFE byte: 0xFE, 0xF0"
   *  removes 0xF0 after 0xFE
   */
  static unescapeFrame(completeFrame: number[]): number[] {
    const frame: number[] = [];
    for (let w = 0; w < completeFrame.length; w++) {
      if (!(completeFrame[w] === 0xf0 && completeFrame[w - 1] === 0xfe)) {
        frame.push(completeFrame[w]);
      }
    }
    return frame;
  }

  static isExpectedCommandResponse(command: number, response: number[]): boolean {
    return response[2] === command;
  }

  static byteArrayToBitArray(frame: number[]): number[] {
    const bitsArray: number[] = [];
    frame.forEach(byte => {
      const bits = bitwiseByte.read(byte as UInt8).reverse();
      bits.forEach(bit => {
        bitsArray.push(bit);
      });
    });
    const numberArray: number[] = [];
    for (let bit = 0; bit < bitsArray.length; bit++) {
      if (bitsArray[bit] === 1) {
        numberArray.push(bit + 1);
      }
    }
    return numberArray;
  }

  private static calculateChecksum(dataBytes: number[]): number {
    let crc = 0x147A;
    for (let w = 0; w < dataBytes.length; w++) {
      crc = crc << 1 & 0xFFFF | crc >>> 15;
      crc = crc ^ 0xFFFF;
      crc = (crc + (crc >> 8) + dataBytes[w]) & 0xFFFF;
      if (dataBytes[w] === 0xfe && dataBytes[w + 1] === 0xf0) {
        // In such case only single 0xFE should be used to update crc.
        w++;
      }
    }
    return crc;
  }
}
