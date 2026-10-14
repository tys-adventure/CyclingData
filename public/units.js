export const METERS_PER_MILE=1609.344;
export const FEET_PER_METER=3.280839895013123;
export const miles=meters=>Number(meters)/METERS_PER_MILE;
export const feet=meters=>Number(meters)*FEET_PER_METER;
export const mph=metersPerSecond=>Number(metersPerSecond)*3600/METERS_PER_MILE;
export const metersFromMiles=value=>Number(value)*METERS_PER_MILE;
export const metersFromFeet=value=>Number(value)/FEET_PER_METER;
