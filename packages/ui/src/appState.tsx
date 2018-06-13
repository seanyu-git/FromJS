import * as Baobab from "baobab";
import { loadSteps } from "./api";

var appState = new Baobab({
  debugMode: false,
  steps: [],
  inspectionTarget: null,
  collapseDomInspector: false
});
window["appState"] = appState;

export default appState;
