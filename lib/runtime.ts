import { format } from 'date-fns';
import { config } from './config';

export const BOTCONFIG: config | undefined = config.parse('config.yaml');
export const LOGNAME = `${format(Date(), "yyyy-MM-dd HH-mm-ss")}.log`;
