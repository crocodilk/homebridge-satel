import {IntegraFrameTools} from '../integra-frame-tools';

export abstract class IntegraCommand<ReturnType> {

  readonly abstract cmd: number;
  abstract responseFrameToResultType: (data: number[]) => ReturnType;
  resultHandler = (data: ReturnType) => {
    return;
  };

  createFrame = (): Buffer => {
    return Buffer.from(IntegraFrameTools.prepareFrame([this.cmd]));
  };

  constructor(resultHandler?: (data: ReturnType) => void) {
    if (resultHandler) {
      this.resultHandler = resultHandler;
    }
  }
}
