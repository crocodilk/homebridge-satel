import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {IntegraSystem} from './integra/integra-system';
import {Config, DeviceConfig} from './config';
import {ZoneAccessory} from './platform-accessories/zone-accessory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SatelIntegraPlatform
  implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private integraSystem!: IntegraSystem;
  public readonly extendedConfig: PlatformConfig & Config;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.log.debug('Config:', this.config);
    this.extendedConfig = this.config as PlatformConfig & Config;

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.integraSystem = IntegraSystem.createInstance(this.extendedConfig.integraIp, this.extendedConfig.integraPort, this.log);
      this.integraSystem.startReadingZones();
      this.syncDevices(this.extendedConfig);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  syncDevices(config: Config): void {
    this.unregisterAccessoriesNotPresentInConfig(config);
    for (const zone of config.zones) {
      this.log.info('Zone', zone);
      const uuid = this.generateUuidForDevice(zone, 'zone');
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new ZoneAccessory(this, existingAccessory);
      } else {
        const accessory = new this.api.platformAccessory(zone.deviceName, uuid);
        accessory.context.device = zone;
        new ZoneAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private unregisterAccessoriesNotPresentInConfig(config: Config) {
    const zoneUuids = config.zones.map(zone => this.generateUuidForDevice(zone, 'zone'));
    for (const existingAccessory of this.accessories) {
      if (!zoneUuids.includes(existingAccessory.UUID)) {
        this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      }
    }
  }

  private generateUuidForDevice(device: DeviceConfig, prefix: string): string {
    return this.api.hap.uuid.generate(`${prefix}-${device.deviceNumber}`);
  }
}
