import {Socket} from 'net';
import {Logger} from 'homebridge';
import {IntegraFrameTools} from './integra-frame-tools';
import {map, mergeMap, Observable, retry, Subject, tap} from 'rxjs';
import {IntegraCommand} from './commands/integra-command';
import {IntegraSystemInfoCommand} from './commands/integra-system-info-command';
import {IntegraZoneStatesCommand} from './commands/integra-zone-states-command';

export class IntegraSystem {

  private static instance: IntegraSystem;

  private readonly log: Logger;

  private readonly zoneStatesSubject = new Subject<number[]>();
  readonly zoneStates$ = this.zoneStatesSubject.asObservable();

  private readonly commandSubject = new Subject<IntegraCommand<any>>();

  private readonly systemInfoCommand = new IntegraSystemInfoCommand();
  private readonly zoneStatesCommand = new IntegraZoneStatesCommand(states => this.zoneStatesSubject.next(states));


  private constructor(host: string, port: number, log: Logger) {
    this.log = log;
    this.commandSubject
      .pipe(
        mergeMap(command => {
          return this.executeCommand(host, port, log, command)
            .pipe(
              retry(1),
            );
        }, 1),
      )
      .subscribe();
  }

  static createInstance(host: string, port: number, log: Logger) {
    if (IntegraSystem.instance) {
      return IntegraSystem.instance;
    }
    IntegraSystem.instance = new IntegraSystem(host, port, log);
    return IntegraSystem.instance;
  }

  static getInstance() {
    if (!IntegraSystem.instance) {
      throw new Error('IntegraSystem has not been initialized');
    }
    return IntegraSystem.instance;
  }

  startReadingZones() {
    setInterval(() => {
      this.commandSubject.next(this.zoneStatesCommand);
    }, 1000);
  }

  readInfo() {
    this.commandSubject.next(this.systemInfoCommand);
  }


  private executeCommand<T>(host: string, port: number, log: Logger, command: IntegraCommand<T>): Observable<T> {
    const requestObservable = new Observable<number[]>((observer) => {
      const connect = () => {
        socket.connect({
          host,
          port,
        }, () => {
          log.debug(`Connected to ${host}:${port}`);
        });
      };
      const socket = new Socket();
      const bufferToSend = command.createFrame();
      connect();
      socket.on('ready', () => {
        log.debug('Socket ready, writing data');
        socket.write(bufferToSend, (err) => {
          if (err) {
            log.error('Error while writing to socket', err);
            observer.error(err);
          }
        });
      });
      socket.on('error', (err) => {
        log.error('Socket error', err);
        observer.error(err);
      });
      socket.on('close', (hadError) => {
        observer.error(hadError ? 'Socket closed due to error' : 'Socket closed');
      });
      socket.on('data', (data) => {
        const receivedFrame = [...data];
        if (IntegraFrameTools.frameIsComplete(receivedFrame)) {
          if (!IntegraFrameTools.checksumValid(receivedFrame)) {
            log.error(`Invalid checksum for: ${IntegraFrameTools.prettyPrintFrame(receivedFrame)}`);
            observer.error(`Invalid checksum for: ${IntegraFrameTools.prettyPrintFrame(receivedFrame)}`);
            return;
          }
          log.debug(`Received data          :`, IntegraFrameTools.prettyPrintFrame(receivedFrame));
          const unescapedFrame = IntegraFrameTools.unescapeFrame(receivedFrame);
          log.debug(`Unescaped received data:`, IntegraFrameTools.prettyPrintFrame(unescapedFrame));
          if (!IntegraFrameTools.isExpectedCommandResponse(command.cmd, unescapedFrame)) {
            log.error(`Unexpected command response: ${IntegraFrameTools.prettyPrintFrame(receivedFrame)}`);
            observer.error(`Unexpected command response: ${IntegraFrameTools.prettyPrintFrame(receivedFrame)}`);
            return;
          }
          observer.next(unescapedFrame);
          observer.complete();
        } else {
          observer.error('Received frame is not complete');
        }
      });
      return () => {
        socket.resetAndDestroy();
        log.debug('Socket destroyed');
      };
    });
    return requestObservable
      .pipe(
        //remove start, checksum and end markers
        map((frame) => {
          const onlyData = frame.slice(3, frame.length - 4);
          log.debug(`Passing data to command:      `, IntegraFrameTools.prettyPrintFrame(onlyData));
          return command.responseFrameToResultType(onlyData);
        }),
        tap(responseData => command.resultHandler(responseData)),
      );
  }
}
