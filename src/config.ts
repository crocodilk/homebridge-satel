export interface Config {
  integraIp: string;
  integraPort: number;
  zones: ZoneConfig[];
}

export interface DeviceConfig {
  deviceName: string;
  deviceNumber: number;
}

export interface ZoneConfig extends DeviceConfig {
  deviceType: ZoneType;
}

export enum ZoneType {
  CONTACT = 'contact',
  MOTION = 'motion',
}
