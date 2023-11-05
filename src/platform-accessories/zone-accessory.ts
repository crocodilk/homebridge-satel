import {SatelIntegraPlatform} from '../platform';
import {PlatformAccessory, Service} from 'homebridge';
import {ZoneConfig, ZoneType} from '../config';
import {firstValueFrom, map, Observable} from 'rxjs';
import {IntegraSystem} from '../integra/integra-system';

export class ZoneAccessory {

  private readonly service: Service;

  private readonly stateStream$: Observable<boolean>;
  private deviceConfig: ZoneConfig;

  constructor(private readonly platform: SatelIntegraPlatform,
    private readonly accessory: PlatformAccessory) {

    this.deviceConfig = accessory.context.device as ZoneConfig;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.stateStream$ = IntegraSystem.getInstance().zoneStates$
      .pipe(
        map(states => states.includes(this.deviceConfig.deviceNumber)),
      );

    if (this.deviceConfig.deviceType === ZoneType.CONTACT) {
      this.service = this.accessory.getService(this.platform.Service.ContactSensor) || this.accessory.addService(this.platform.Service.ContactSensor);

      this.service.setCharacteristic(this.platform.Characteristic.Name, this.deviceConfig.deviceName);
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .onGet(this.getContactSensorState);

      this.stateStream$.subscribe(state => {
        this.service.updateCharacteristic(
          this.platform.Characteristic.ContactSensorState,
          this.mapZoneStateToContactSensorState(state),
        );
      });
    } else {
      this.service = this.accessory.getService(this.platform.Service.MotionSensor) || this.accessory.addService(this.platform.Service.MotionSensor);

      this.service.setCharacteristic(this.platform.Characteristic.Name, this.deviceConfig.deviceName);
      this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
        .onGet(this.getMotionSensorState);

      this.stateStream$.subscribe(state => {
        this.service.updateCharacteristic(
          this.platform.Characteristic.MotionDetected,
          state,
        );
      });
    }
  }

  getContactSensorState = async () => {
    return await firstValueFrom(this.stateStream$.pipe(map(this.mapZoneStateToContactSensorState)));
  };

  getMotionSensorState = async () => {
    return await firstValueFrom(this.stateStream$);
  };

  private mapZoneStateToContactSensorState = (state: boolean): number => {
    return state ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
  };
}
