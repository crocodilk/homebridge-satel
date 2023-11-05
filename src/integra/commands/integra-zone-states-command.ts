import {IntegraCommand} from './integra-command';
import {IntegraFrameTools} from '../integra-frame-tools';

/**
 * produces violated zone numbers array
 */
export class IntegraZoneStatesCommand
  extends IntegraCommand<number[]> {

  readonly cmd = 0x00;

  createFrame: () => Buffer = () => {
    return Buffer.from(IntegraFrameTools.prepareFrame([this.cmd, 0x01]));
  };

  responseFrameToResultType = (data: number[]): number[] => {
    return IntegraFrameTools.byteArrayToBitArray(data);
  };
}
