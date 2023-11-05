import {IntegraCommand} from './integra-command';

export interface IntegraSystemInfo {
  version: string;
  model: string;
  numberOfObjects: number;
  numberOfPartitions: number;
  numberOfZones: number;
  numberOfOutputs: number;
  numberOfTimers: number;
}

export class IntegraSystemInfoCommand
  extends IntegraCommand<IntegraSystemInfo> {

  readonly cmd = 0x7E;

  responseFrameToResultType = (frame: number[]): IntegraSystemInfo => {
    const integraModel = frame[0];
    const tmpVersion = Buffer.from(frame.slice(1, 12)).toString('binary');
    const version = `${tmpVersion[0]}.${tmpVersion.slice(1, 3)} ${tmpVersion.slice(3, 7)}-${tmpVersion.slice(7, 9)}-${tmpVersion.slice(9, 11)}`;
    if (integraModel === 0) {
      return {
        version,
        model: 'INTEGRA 24',
        numberOfZones: 24,
        numberOfOutputs: 20,
        numberOfPartitions: 4,
        numberOfObjects: 0,
        numberOfTimers: 16,
      };
    }
    if (integraModel === 1) {
      return {
        version,
        model: 'INTEGRA 32',
        numberOfZones: 32,
        numberOfOutputs: 32,
        numberOfPartitions: 16,
        numberOfObjects: 4,
        numberOfTimers: 28,
      };
    }
    if (integraModel === 2 || integraModel === 66) {
      const model = integraModel === 2 ? 'INTEGRA 64' : 'INTEGRA 64 PLUS';
      return {
        version,
        model,
        numberOfZones: 64,
        numberOfOutputs: 64,
        numberOfPartitions: 32,
        numberOfObjects: 8,
        numberOfTimers: 64,
      };
    }
    if (integraModel === 3 || integraModel === 4 || integraModel === 67 || integraModel === 132) {
      const model = integraModel === 3
        ? 'INTEGRA 128'
        : integraModel === 4
          ? 'INTEGRA 128-WRL SIM300'
          : integraModel === 67
            ? 'INTEGRA 128 PLUS'
            : 'INTEGRA 128-WRL LEON';
      return {
        version,
        model,
        numberOfZones: 128,
        numberOfOutputs: 128,
        numberOfPartitions: 32,
        numberOfObjects: 8,
        numberOfTimers: 64,
      };
    }
    if (integraModel === 72) {
      return {
        version,
        model: 'INTEGRA 256 PLUS',
        numberOfZones: 256,
        numberOfOutputs: 256,
        numberOfPartitions: 32,
        numberOfObjects: 8,
        numberOfTimers: 64,
      };
    }
    throw new Error(`Unknown integra model: ${integraModel}`);
  };
}
