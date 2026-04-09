import{c as t}from"./index-BU4a9Rtb.js";/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",key:"9ktpf1"}]],C=t("compass",v);/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],H=t("funnel",g);/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0",key:"11u0oz"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["path",{d:"M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712",key:"q8zwxj"}]],x=t("map-pinned",m);/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],N=t("menu",f);/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["circle",{cx:"6",cy:"19",r:"3",key:"1kj8tv"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",key:"1d8sl"}],["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}]],L=t("route",_);/**
 * @license lucide-react v0.574.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"M21 4v16",key:"7j8fe9"}],["path",{d:"M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z",key:"zs4d6"}]],M=t("skip-forward",O),i={showNavigationHUD:!0,showSpeedOverlay:!0,showArrivalHUD:!0,showFuelCost:!0,showHosStatus:!0,showMapControls:!0,showWeatherOverlay:!0,showTruckRestrictions:!0,showHighwayShields:!0,showSpeedLimitSigns:!0,showExitSigns:!0,showCmvWarnings:!0,showCurveWarnings:!0,showTrafficIncidents:!0,showWaypointMarkers:!0,showManeuverPreview:!0,showRouteComparison:!0,showLaneGuidance:!0,showCompassRose:!0,showNextStop:!0,showSpeedWarning:!0,speedWarningTolerance:5,tripPanelPosition:"right"},h="nav_hud_layout",d="nav_hud_order",a={Navigation:["showNavigationHUD","showLaneGuidance","showSpeedOverlay","showArrivalHUD","showManeuverPreview","showCompassRose","showNextStop","showSpeedWarning"],Panels:["showFuelCost","showHosStatus","showMapControls","showRouteComparison","showWeatherOverlay"],Signs:["showHighwayShields","showSpeedLimitSigns","showExitSigns","showCurveWarnings","showCmvWarnings","showTruckRestrictions","showTrafficIncidents","showWaypointMarkers"]};function A(){try{const e=localStorage.getItem(h);if(e)return{...i,...JSON.parse(e)}}catch{}return{...i}}function D(e){try{localStorage.setItem(h,JSON.stringify(e))}catch{}}function E(){try{const e=localStorage.getItem(d);if(e){const w=JSON.parse(e),r={};for(const s of Object.keys(a)){const n=w[s]||[],c=a[s],S=c.filter(o=>!n.includes(o));r[s]=[...n.filter(o=>c.includes(o)),...S]}return r}}catch{}return{...a}}function P(e){try{localStorage.setItem(d,JSON.stringify(e))}catch{}}const y="nav_hud_positions",u={navigationHUD:{x:50,y:3},speedOverlay:{x:3,y:72},maneuverPreview:{x:82,y:3},weatherPanel:{x:3,y:42},tripPanel:{x:82,y:55},mapControls:{x:92,y:38},routeComparison:{x:50,y:14},arrivalHUD:{x:50,y:90},compassRose:{x:3,y:85},nextStop:{x:50,y:82}};function R(){try{const e=localStorage.getItem(y);if(e)return{...u,...JSON.parse(e)}}catch{}return{...u}}function I(e){try{localStorage.setItem(y,JSON.stringify(e))}catch{}}const p="nav_hud_scales",l={navigationHUD:1,speedOverlay:1,arrivalHUD:1,maneuverPreview:1,weatherPanel:1,fuelCost:1,hosStatus:1,mapControls:1,compassRose:1,nextStop:1,routeComparison:1},U=[{value:.7,label:"XS"},{value:.85,label:"S"},{value:1,label:"M"},{value:1.15,label:"L"},{value:1.3,label:"XL"}];function T(){try{const e=localStorage.getItem(p);if(e)return{...l,...JSON.parse(e)}}catch{}return{...l}}function W(e){try{localStorage.setItem(p,JSON.stringify(e))}catch{}}export{C,u as D,H as F,N as M,L as R,M as S,R as a,T as b,x as c,E as d,P as e,I as f,W as g,U as h,a as i,i as j,l as k,A as l,D as s};
