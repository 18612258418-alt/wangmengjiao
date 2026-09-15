import {commonScenario} from "./common"; import {studentScenario} from "./student"; import type {ScenarioId,ScenarioPackage} from "./types";
export function readScenarioId(search=window.location.search,hostname=window.location.hostname):ScenarioId{const requested=new URLSearchParams(search).get("scenario");if(requested==="common"||requested==="student")return requested;return hostname==="common.imemo-space.cn"||hostname==="memo-common-preview.vercel.app"?"common":"student"}
export function getScenario(id=readScenarioId()):ScenarioPackage{return id==="common"?commonScenario:studentScenario}
