import {commonScenario} from "./common"; import {studentScenario} from "./student"; import type {ScenarioId,ScenarioPackage} from "./types";
export function readScenarioId(search=window.location.search):ScenarioId{return new URLSearchParams(search).get("scenario")==="common"?"common":"student"}
export function getScenario(id=readScenarioId()):ScenarioPackage{return id==="common"?commonScenario:studentScenario}
