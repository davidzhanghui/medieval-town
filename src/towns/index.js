/* 十个远方村镇的建造函数表；key 与 world.js 里的 SITES 一一对应 */
import harbor from './harbor.js';
import mining from './mining.js';
import vintner from './vintner.js';
import oak from './oak.js';
import wool from './wool.js';
import sky from './sky.js';
import marsh from './marsh.js';
import frost from './frost.js';
import scholar from './scholar.js';
import bazaar from './bazaar.js';
import solcastle from './sol_castle.js';
import soltown from './sol_town.js';
import solvillage from './sol_village.js';
import soloasis from './sol_oasis.js';
import * as yunjin from './k_yunjin.js';
import * as viking from './k_viking.js';
import * as jungle from './k_jungle.js';
import * as marble from './k_marble.js';
import * as moss from './k_moss.js';
import * as steam from './k_steam.js';
import { realmVillageBuilders } from './realm_villages.js';

export const TOWN_BUILDERS = {
  harbor,
  mining,
  vintner,
  oak,
  wool,
  sky,
  marsh,
  frost,
  scholar,
  bazaar,
  solcastle,
  soltown,
  solvillage,
  soloasis,
  yjcastle: yunjin.castle, yjtown: yunjin.town,
  fgcastle: viking.castle, fgtown: viking.town,
  jvcastle: jungle.castle, jvtown: jungle.town,
  mmcastle: marble.castle, mmtown: marble.town,
  mlcastle: moss.castle, mltown: moss.town,
  sfcastle: steam.castle, sftown: steam.town,
  ...realmVillageBuilders(),
};
