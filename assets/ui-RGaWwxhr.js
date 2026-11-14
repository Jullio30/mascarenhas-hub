function Lt(a){return a&&a.__esModule&&Object.prototype.hasOwnProperty.call(a,"default")?a.default:a}var ye={exports:{}},V={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Oe;function Nt(){if(Oe)return V;Oe=1;var a=Symbol.for("react.element"),o=Symbol.for("react.portal"),i=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),t=Symbol.for("react.profiler"),n=Symbol.for("react.provider"),c=Symbol.for("react.context"),h=Symbol.for("react.forward_ref"),l=Symbol.for("react.suspense"),g=Symbol.for("react.memo"),v=Symbol.for("react.lazy"),x=Symbol.iterator;function S(e){return e===null||typeof e!="object"?null:(e=x&&e[x]||e["@@iterator"],typeof e=="function"?e:null)}var M={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},F=Object.assign,D={};function _(e,u,f){this.props=e,this.context=u,this.refs=D,this.updater=f||M}_.prototype.isReactComponent={},_.prototype.setState=function(e,u){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,u,"setState")},_.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function z(){}z.prototype=_.prototype;function j(e,u,f){this.props=e,this.context=u,this.refs=D,this.updater=f||M}var I=j.prototype=new z;I.constructor=j,F(I,_.prototype),I.isPureReactComponent=!0;var N=Array.isArray,$=Object.prototype.hasOwnProperty,w={current:null},T={key:!0,ref:!0,__self:!0,__source:!0};function A(e,u,f){var m,p={},b=null,y=null;if(u!=null)for(m in u.ref!==void 0&&(y=u.ref),u.key!==void 0&&(b=""+u.key),u)$.call(u,m)&&!T.hasOwnProperty(m)&&(p[m]=u[m]);var k=arguments.length-2;if(k===1)p.children=f;else if(1<k){for(var R=Array(k),U=0;U<k;U++)R[U]=arguments[U+2];p.children=R}if(e&&e.defaultProps)for(m in k=e.defaultProps,k)p[m]===void 0&&(p[m]=k[m]);return{$$typeof:a,type:e,key:b,ref:y,props:p,_owner:w.current}}function C(e,u){return{$$typeof:a,type:e.type,key:u,ref:e.ref,props:e.props,_owner:e._owner}}function L(e){return typeof e=="object"&&e!==null&&e.$$typeof===a}function B(e){var u={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(f){return u[f]})}var P=/\/+/g;function E(e,u){return typeof e=="object"&&e!==null&&e.key!=null?B(""+e.key):u.toString(36)}function q(e,u,f,m,p){var b=typeof e;(b==="undefined"||b==="boolean")&&(e=null);var y=!1;if(e===null)y=!0;else switch(b){case"string":case"number":y=!0;break;case"object":switch(e.$$typeof){case a:case o:y=!0}}if(y)return y=e,p=p(y),e=m===""?"."+E(y,0):m,N(p)?(f="",e!=null&&(f=e.replace(P,"$&/")+"/"),q(p,u,f,"",function(U){return U})):p!=null&&(L(p)&&(p=C(p,f+(!p.key||y&&y.key===p.key?"":(""+p.key).replace(P,"$&/")+"/")+e)),u.push(p)),1;if(y=0,m=m===""?".":m+":",N(e))for(var k=0;k<e.length;k++){b=e[k];var R=m+E(b,k);y+=q(b,u,f,R,p)}else if(R=S(e),typeof R=="function")for(e=R.call(e),k=0;!(b=e.next()).done;)b=b.value,R=m+E(b,k++),y+=q(b,u,f,R,p);else if(b==="object")throw u=String(e),Error("Objects are not valid as a React child (found: "+(u==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":u)+"). If you meant to render a collection of children, use an array instead.");return y}function J(e,u,f){if(e==null)return e;var m=[],p=0;return q(e,m,"","",function(b){return u.call(f,b,p++)}),m}function X(e){if(e._status===-1){var u=e._result;u=u(),u.then(function(f){(e._status===0||e._status===-1)&&(e._status=1,e._result=f)},function(f){(e._status===0||e._status===-1)&&(e._status=2,e._result=f)}),e._status===-1&&(e._status=0,e._result=u)}if(e._status===1)return e._result.default;throw e._result}var Z={current:null},re={transition:null},le={ReactCurrentDispatcher:Z,ReactCurrentBatchConfig:re,ReactCurrentOwner:w};function s(){throw Error("act(...) is not supported in production builds of React.")}return V.Children={map:J,forEach:function(e,u,f){J(e,function(){u.apply(this,arguments)},f)},count:function(e){var u=0;return J(e,function(){u++}),u},toArray:function(e){return J(e,function(u){return u})||[]},only:function(e){if(!L(e))throw Error("React.Children.only expected to receive a single React element child.");return e}},V.Component=_,V.Fragment=i,V.Profiler=t,V.PureComponent=j,V.StrictMode=r,V.Suspense=l,V.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=le,V.act=s,V.cloneElement=function(e,u,f){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var m=F({},e.props),p=e.key,b=e.ref,y=e._owner;if(u!=null){if(u.ref!==void 0&&(b=u.ref,y=w.current),u.key!==void 0&&(p=""+u.key),e.type&&e.type.defaultProps)var k=e.type.defaultProps;for(R in u)$.call(u,R)&&!T.hasOwnProperty(R)&&(m[R]=u[R]===void 0&&k!==void 0?k[R]:u[R])}var R=arguments.length-2;if(R===1)m.children=f;else if(1<R){k=Array(R);for(var U=0;U<R;U++)k[U]=arguments[U+2];m.children=k}return{$$typeof:a,type:e.type,key:p,ref:b,props:m,_owner:y}},V.createContext=function(e){return e={$$typeof:c,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:n,_context:e},e.Consumer=e},V.createElement=A,V.createFactory=function(e){var u=A.bind(null,e);return u.type=e,u},V.createRef=function(){return{current:null}},V.forwardRef=function(e){return{$$typeof:h,render:e}},V.isValidElement=L,V.lazy=function(e){return{$$typeof:v,_payload:{_status:-1,_result:e},_init:X}},V.memo=function(e,u){return{$$typeof:g,type:e,compare:u===void 0?null:u}},V.startTransition=function(e){var u=re.transition;re.transition={};try{e()}finally{re.transition=u}},V.unstable_act=s,V.useCallback=function(e,u){return Z.current.useCallback(e,u)},V.useContext=function(e){return Z.current.useContext(e)},V.useDebugValue=function(){},V.useDeferredValue=function(e){return Z.current.useDeferredValue(e)},V.useEffect=function(e,u){return Z.current.useEffect(e,u)},V.useId=function(){return Z.current.useId()},V.useImperativeHandle=function(e,u,f){return Z.current.useImperativeHandle(e,u,f)},V.useInsertionEffect=function(e,u){return Z.current.useInsertionEffect(e,u)},V.useLayoutEffect=function(e,u){return Z.current.useLayoutEffect(e,u)},V.useMemo=function(e,u){return Z.current.useMemo(e,u)},V.useReducer=function(e,u,f){return Z.current.useReducer(e,u,f)},V.useRef=function(e){return Z.current.useRef(e)},V.useState=function(e){return Z.current.useState(e)},V.useSyncExternalStore=function(e,u,f){return Z.current.useSyncExternalStore(e,u,f)},V.useTransition=function(){return Z.current.useTransition()},V.version="18.3.1",V}var $e;function qt(){return $e||($e=1,ye.exports=Nt()),ye.exports}var ue=qt();const or=Lt(ue);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=a=>a.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Mt=(...a)=>a.filter((o,i,r)=>!!o&&r.indexOf(o)===i).join(" ");/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var zt={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=ue.forwardRef(({color:a="currentColor",size:o=24,strokeWidth:i=2,absoluteStrokeWidth:r,className:t="",children:n,iconNode:c,...h},l)=>ue.createElement("svg",{ref:l,...zt,width:o,height:o,stroke:a,strokeWidth:r?Number(i)*24/Number(o):i,className:Mt("lucide",t),...h},[...c.map(([g,v])=>ue.createElement(g,v)),...Array.isArray(n)?n:[n]]));/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=(a,o)=>{const i=ue.forwardRef(({className:r,...t},n)=>ue.createElement(Ft,{ref:n,iconNode:o,className:Mt(`lucide-${_t(a)}`,r),...t}));return i.displayName=`${a}`,i};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=d("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=d("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=d("Ban",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.9 4.9 14.2 14.2",key:"1m5liu"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=d("Bomb",[["circle",{cx:"11",cy:"13",r:"9",key:"hd149"}],["path",{d:"M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95",key:"jp4j1b"}],["path",{d:"m22 2-1.5 1.5",key:"ay92ug"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=d("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=d("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=d("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=d("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=d("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=d("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=d("CircleHelp",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=d("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=d("Crosshair",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=d("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=d("Dices",[["rect",{width:"12",height:"12",x:"2",y:"10",rx:"2",ry:"2",key:"6agr2n"}],["path",{d:"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6",key:"1o487t"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"M10 14h.01",key:"ssrbsk"}],["path",{d:"M15 6h.01",key:"cblpky"}],["path",{d:"M18 9h.01",key:"2061c0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=d("DoorOpen",[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14",key:"hrm0s9"}],["path",{d:"M2 20h3",key:"1gaodv"}],["path",{d:"M13 20h9",key:"s90cdi"}],["path",{d:"M10 12v.01",key:"vx6srw"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",key:"199qr4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=d("Drama",[["path",{d:"M10 11h.01",key:"d2at3l"}],["path",{d:"M14 6h.01",key:"k028ub"}],["path",{d:"M18 6h.01",key:"1v4wsw"}],["path",{d:"M6.5 13.1h.01",key:"1748ia"}],["path",{d:"M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3",key:"172yzv"}],["path",{d:"M17.4 9.9c-.8.8-2 .8-2.8 0",key:"1obv0w"}],["path",{d:"M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7",key:"rqjl8i"}],["path",{d:"M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4",key:"1mr6wy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=d("Droplet",[["path",{d:"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",key:"c7niix"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=d("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rr=d("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=d("FastForward",[["polygon",{points:"13 19 22 12 13 5 13 19",key:"587y9g"}],["polygon",{points:"2 19 11 12 2 5 2 19",key:"3pweh0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=d("FilePlus2",[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4",key:"1pf5j1"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M3 15h6",key:"4e2qda"}],["path",{d:"M6 12v6",key:"1u72j0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=d("Fingerprint",[["path",{d:"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",key:"1nerag"}],["path",{d:"M14 13.12c0 2.38 0 6.38-1 8.88",key:"o46ks0"}],["path",{d:"M17.29 21.02c.12-.6.43-2.3.5-3.02",key:"ptglia"}],["path",{d:"M2 12a10 10 0 0 1 18-6",key:"ydlgp0"}],["path",{d:"M2 16h.01",key:"1gqxmh"}],["path",{d:"M21.8 16c.2-2 .131-5.354 0-6",key:"drycrb"}],["path",{d:"M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",key:"1tidbn"}],["path",{d:"M8.65 22c.21-.66.45-1.32.57-2",key:"13wd9y"}],["path",{d:"M9 6.8a6 6 0 0 1 9 5.2v2",key:"1fr1j5"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=d("Flag",[["path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",key:"i9b6wo"}],["line",{x1:"4",x2:"4",y1:"22",y2:"15",key:"1cm3nv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=d("Flame",[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",key:"96xj49"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=d("Gamepad2",[["line",{x1:"6",x2:"10",y1:"11",y2:"11",key:"1gktln"}],["line",{x1:"8",x2:"8",y1:"9",y2:"13",key:"qnk9ow"}],["line",{x1:"15",x2:"15.01",y1:"12",y2:"12",key:"krot7o"}],["line",{x1:"18",x2:"18.01",y1:"10",y2:"10",key:"1lcuu1"}],["path",{d:"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z",key:"mfqc10"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=d("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=d("GripVertical",[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nr=d("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=d("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=d("History",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=d("Hourglass",[["path",{d:"M5 22h14",key:"ehvnwv"}],["path",{d:"M5 2h14",key:"pdyrp9"}],["path",{d:"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22",key:"1d314k"}],["path",{d:"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2",key:"1vvvr6"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=d("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=d("KeyRound",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=d("Laptop",[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16",key:"tarvll"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=d("Library",[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=d("LifeBuoy",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.93 4.93 4.24 4.24",key:"1ymg45"}],["path",{d:"m14.83 9.17 4.24-4.24",key:"1cb5xl"}],["path",{d:"m14.83 14.83 4.24 4.24",key:"q42g0n"}],["path",{d:"m9.17 14.83-4.24 4.24",key:"bqpfvv"}],["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hr=d("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=d("ListOrdered",[["path",{d:"M10 12h11",key:"6m4ad9"}],["path",{d:"M10 18h11",key:"11hvi2"}],["path",{d:"M10 6h11",key:"c7qv1k"}],["path",{d:"M4 10h2",key:"16xx2s"}],["path",{d:"M4 6h1v4",key:"cnovpq"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",key:"m9a95d"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=d("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=d("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=d("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jr=d("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=d("MessagesSquare",[["path",{d:"M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z",key:"p1xzt8"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1",key:"1cx29u"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=d("Music2",[["circle",{cx:"8",cy:"18",r:"4",key:"1fc0mg"}],["path",{d:"M12 18V2l7 4",key:"g04rme"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=d("Music",[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qr=d("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=d("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const en=d("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tn=d("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rn=d("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nn=d("PlugZap",[["path",{d:"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z",key:"goz73y"}],["path",{d:"m2 22 3-3",key:"19mgm9"}],["path",{d:"M7.5 13.5 10 11",key:"7xgeeb"}],["path",{d:"M10.5 16.5 13 14",key:"10btkg"}],["path",{d:"m18 3-4 4h6l-4 4",key:"16psg9"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const an=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const on=d("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sn=d("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cn=d("Rewind",[["polygon",{points:"11 19 2 12 11 5 11 19",key:"14yba5"}],["polygon",{points:"22 19 13 12 22 5 22 19",key:"1pi1cj"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const un=d("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ln=d("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hn=d("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dn=d("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fn=d("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yn=d("SkipForward",[["polygon",{points:"5 4 15 12 5 20 5 4",key:"16p6eg"}],["line",{x1:"19",x2:"19",y1:"5",y2:"19",key:"futhcm"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gn=d("Skull",[["path",{d:"m12.5 17-.5-1-.5 1h1z",key:"3me087"}],["path",{d:"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",key:"1o5pge"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pn=d("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mn=d("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kn=d("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vn=d("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mn=d("ThumbsDown",[["path",{d:"M17 14V2",key:"8ymqnk"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",key:"m61m77"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wn=d("ThumbsUp",[["path",{d:"M7 10v12",key:"1qc93n"}],["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",key:"emmmcr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cn=d("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bn=d("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const En=d("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rn=d("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sn=d("TvMinimal",[["path",{d:"M7 21h10",key:"1b0cd5"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const An=d("Tv",[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2",key:"10ag99"}],["polyline",{points:"17 2 12 7 7 2",key:"11pgbg"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bn=d("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tn=d("UserCog",[["circle",{cx:"18",cy:"15",r:"3",key:"gjjjvw"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M10 15H6a4 4 0 0 0-4 4v2",key:"1nfge6"}],["path",{d:"m21.7 16.4-.9-.3",key:"12j9ji"}],["path",{d:"m15.2 13.9-.9-.3",key:"1fdjdi"}],["path",{d:"m16.6 18.7.3-.9",key:"heedtr"}],["path",{d:"m19.1 12.2.3-.9",key:"1af3ki"}],["path",{d:"m19.6 18.7-.4-1",key:"1x9vze"}],["path",{d:"m16.8 12.3-.4-1",key:"vqeiwj"}],["path",{d:"m14.3 16.6 1-.4",key:"1qlj63"}],["path",{d:"m20.7 13.8 1-.4",key:"1v5t8k"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pn=d("UserMinus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xn=d("UserX",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const In=d("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ln=d("VenetianMask",[["path",{d:"M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z",key:"1g6z3j"}],["path",{d:"M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z",key:"c2lwnf"}],["path",{d:"M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z",key:"njd9zo"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=d("Volume2",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qn=d("VolumeX",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15",key:"1ewh16"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15",key:"5ykzw1"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=d("Vote",[["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}],["path",{d:"M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z",key:"1ezoue"}],["path",{d:"M22 19H2",key:"nuriw5"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zn=d("WifiOff",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69",key:"1dl1wf"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523",key:"4k23kn"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643",key:"1grhjp"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764",key:"z3jwby"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=d("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dn=d("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=d("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);var ce={},ge,Ke;function Dt(){return Ke||(Ke=1,ge=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),ge}var pe={},ae={},Ze;function ie(){if(Ze)return ae;Ze=1;let a;const o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return ae.getSymbolSize=function(r){if(!r)throw new Error('"version" cannot be null or undefined');if(r<1||r>40)throw new Error('"version" should be in range from 1 to 40');return r*4+17},ae.getSymbolTotalCodewords=function(r){return o[r]},ae.getBCHDigit=function(i){let r=0;for(;i!==0;)r++,i>>>=1;return r},ae.setToSJISFunction=function(r){if(typeof r!="function")throw new Error('"toSJISFunc" is not a valid function.');a=r},ae.isKanjiModeEnabled=function(){return typeof a<"u"},ae.toSJIS=function(r){return a(r)},ae}var me={},Je;function Fe(){return Je||(Je=1,(function(a){a.L={bit:1},a.M={bit:0},a.Q={bit:3},a.H={bit:2};function o(i){if(typeof i!="string")throw new Error("Param is not a string");switch(i.toLowerCase()){case"l":case"low":return a.L;case"m":case"medium":return a.M;case"q":case"quartile":return a.Q;case"h":case"high":return a.H;default:throw new Error("Unknown EC Level: "+i)}}a.isValid=function(r){return r&&typeof r.bit<"u"&&r.bit>=0&&r.bit<4},a.from=function(r,t){if(a.isValid(r))return r;try{return o(r)}catch{return t}}})(me)),me}var ke,Ge;function jt(){if(Ge)return ke;Ge=1;function a(){this.buffer=[],this.length=0}return a.prototype={get:function(o){const i=Math.floor(o/8);return(this.buffer[i]>>>7-o%8&1)===1},put:function(o,i){for(let r=0;r<i;r++)this.putBit((o>>>i-r-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(o){const i=Math.floor(this.length/8);this.buffer.length<=i&&this.buffer.push(0),o&&(this.buffer[i]|=128>>>this.length%8),this.length++}},ke=a,ke}var ve,We;function Ut(){if(We)return ve;We=1;function a(o){if(!o||o<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=o,this.data=new Uint8Array(o*o),this.reservedBit=new Uint8Array(o*o)}return a.prototype.set=function(o,i,r,t){const n=o*this.size+i;this.data[n]=r,t&&(this.reservedBit[n]=!0)},a.prototype.get=function(o,i){return this.data[o*this.size+i]},a.prototype.xor=function(o,i,r){this.data[o*this.size+i]^=r},a.prototype.isReserved=function(o,i){return this.reservedBit[o*this.size+i]},ve=a,ve}var Me={},Ye;function Vt(){return Ye||(Ye=1,(function(a){const o=ie().getSymbolSize;a.getRowColCoords=function(r){if(r===1)return[];const t=Math.floor(r/7)+2,n=o(r),c=n===145?26:Math.ceil((n-13)/(2*t-2))*2,h=[n-7];for(let l=1;l<t-1;l++)h[l]=h[l-1]-c;return h.push(6),h.reverse()},a.getPositions=function(r){const t=[],n=a.getRowColCoords(r),c=n.length;for(let h=0;h<c;h++)for(let l=0;l<c;l++)h===0&&l===0||h===0&&l===c-1||h===c-1&&l===0||t.push([n[h],n[l]]);return t}})(Me)),Me}var we={},Qe;function Ht(){if(Qe)return we;Qe=1;const a=ie().getSymbolSize,o=7;return we.getPositions=function(r){const t=a(r);return[[0,0],[t-o,0],[0,t-o]]},we}var Ce={},Xe;function Ot(){return Xe||(Xe=1,(function(a){a.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const o={N1:3,N2:3,N3:40,N4:10};a.isValid=function(t){return t!=null&&t!==""&&!isNaN(t)&&t>=0&&t<=7},a.from=function(t){return a.isValid(t)?parseInt(t,10):void 0},a.getPenaltyN1=function(t){const n=t.size;let c=0,h=0,l=0,g=null,v=null;for(let x=0;x<n;x++){h=l=0,g=v=null;for(let S=0;S<n;S++){let M=t.get(x,S);M===g?h++:(h>=5&&(c+=o.N1+(h-5)),g=M,h=1),M=t.get(S,x),M===v?l++:(l>=5&&(c+=o.N1+(l-5)),v=M,l=1)}h>=5&&(c+=o.N1+(h-5)),l>=5&&(c+=o.N1+(l-5))}return c},a.getPenaltyN2=function(t){const n=t.size;let c=0;for(let h=0;h<n-1;h++)for(let l=0;l<n-1;l++){const g=t.get(h,l)+t.get(h,l+1)+t.get(h+1,l)+t.get(h+1,l+1);(g===4||g===0)&&c++}return c*o.N2},a.getPenaltyN3=function(t){const n=t.size;let c=0,h=0,l=0;for(let g=0;g<n;g++){h=l=0;for(let v=0;v<n;v++)h=h<<1&2047|t.get(g,v),v>=10&&(h===1488||h===93)&&c++,l=l<<1&2047|t.get(v,g),v>=10&&(l===1488||l===93)&&c++}return c*o.N3},a.getPenaltyN4=function(t){let n=0;const c=t.data.length;for(let l=0;l<c;l++)n+=t.data[l];return Math.abs(Math.ceil(n*100/c/5)-10)*o.N4};function i(r,t,n){switch(r){case a.Patterns.PATTERN000:return(t+n)%2===0;case a.Patterns.PATTERN001:return t%2===0;case a.Patterns.PATTERN010:return n%3===0;case a.Patterns.PATTERN011:return(t+n)%3===0;case a.Patterns.PATTERN100:return(Math.floor(t/2)+Math.floor(n/3))%2===0;case a.Patterns.PATTERN101:return t*n%2+t*n%3===0;case a.Patterns.PATTERN110:return(t*n%2+t*n%3)%2===0;case a.Patterns.PATTERN111:return(t*n%3+(t+n)%2)%2===0;default:throw new Error("bad maskPattern:"+r)}}a.applyMask=function(t,n){const c=n.size;for(let h=0;h<c;h++)for(let l=0;l<c;l++)n.isReserved(l,h)||n.xor(l,h,i(t,l,h))},a.getBestMask=function(t,n){const c=Object.keys(a.Patterns).length;let h=0,l=1/0;for(let g=0;g<c;g++){n(g),a.applyMask(g,t);const v=a.getPenaltyN1(t)+a.getPenaltyN2(t)+a.getPenaltyN3(t)+a.getPenaltyN4(t);a.applyMask(g,t),v<l&&(l=v,h=g)}return h}})(Ce)),Ce}var de={},et;function wt(){if(et)return de;et=1;const a=Fe(),o=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return de.getBlocksCount=function(t,n){switch(n){case a.L:return o[(t-1)*4+0];case a.M:return o[(t-1)*4+1];case a.Q:return o[(t-1)*4+2];case a.H:return o[(t-1)*4+3];default:return}},de.getTotalCodewordsCount=function(t,n){switch(n){case a.L:return i[(t-1)*4+0];case a.M:return i[(t-1)*4+1];case a.Q:return i[(t-1)*4+2];case a.H:return i[(t-1)*4+3];default:return}},de}var be={},he={},tt;function $t(){if(tt)return he;tt=1;const a=new Uint8Array(512),o=new Uint8Array(256);return(function(){let r=1;for(let t=0;t<255;t++)a[t]=r,o[r]=t,r<<=1,r&256&&(r^=285);for(let t=255;t<512;t++)a[t]=a[t-255]})(),he.log=function(r){if(r<1)throw new Error("log("+r+")");return o[r]},he.exp=function(r){return a[r]},he.mul=function(r,t){return r===0||t===0?0:a[o[r]+o[t]]},he}var rt;function Kt(){return rt||(rt=1,(function(a){const o=$t();a.mul=function(r,t){const n=new Uint8Array(r.length+t.length-1);for(let c=0;c<r.length;c++)for(let h=0;h<t.length;h++)n[c+h]^=o.mul(r[c],t[h]);return n},a.mod=function(r,t){let n=new Uint8Array(r);for(;n.length-t.length>=0;){const c=n[0];for(let l=0;l<t.length;l++)n[l]^=o.mul(t[l],c);let h=0;for(;h<n.length&&n[h]===0;)h++;n=n.slice(h)}return n},a.generateECPolynomial=function(r){let t=new Uint8Array([1]);for(let n=0;n<r;n++)t=a.mul(t,new Uint8Array([1,o.exp(n)]));return t}})(be)),be}var Ee,nt;function Zt(){if(nt)return Ee;nt=1;const a=Kt();function o(i){this.genPoly=void 0,this.degree=i,this.degree&&this.initialize(this.degree)}return o.prototype.initialize=function(r){this.degree=r,this.genPoly=a.generateECPolynomial(this.degree)},o.prototype.encode=function(r){if(!this.genPoly)throw new Error("Encoder not initialized");const t=new Uint8Array(r.length+this.degree);t.set(r);const n=a.mod(t,this.genPoly),c=this.degree-n.length;if(c>0){const h=new Uint8Array(this.degree);return h.set(n,c),h}return n},Ee=o,Ee}var Re={},Se={},Ae={},at;function Ct(){return at||(at=1,Ae.isValid=function(o){return!isNaN(o)&&o>=1&&o<=40}),Ae}var te={},ot;function bt(){if(ot)return te;ot=1;const a="[0-9]+",o="[A-Z $%*+\\-./:]+";let i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";i=i.replace(/u/g,"\\u");const r="(?:(?![A-Z0-9 $%*+\\-./:]|"+i+`)(?:.|[\r
]))+`;te.KANJI=new RegExp(i,"g"),te.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),te.BYTE=new RegExp(r,"g"),te.NUMERIC=new RegExp(a,"g"),te.ALPHANUMERIC=new RegExp(o,"g");const t=new RegExp("^"+i+"$"),n=new RegExp("^"+a+"$"),c=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return te.testKanji=function(l){return t.test(l)},te.testNumeric=function(l){return n.test(l)},te.testAlphanumeric=function(l){return c.test(l)},te}var it;function se(){return it||(it=1,(function(a){const o=Ct(),i=bt();a.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},a.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},a.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},a.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},a.MIXED={bit:-1},a.getCharCountIndicator=function(n,c){if(!n.ccBits)throw new Error("Invalid mode: "+n);if(!o.isValid(c))throw new Error("Invalid version: "+c);return c>=1&&c<10?n.ccBits[0]:c<27?n.ccBits[1]:n.ccBits[2]},a.getBestModeForData=function(n){return i.testNumeric(n)?a.NUMERIC:i.testAlphanumeric(n)?a.ALPHANUMERIC:i.testKanji(n)?a.KANJI:a.BYTE},a.toString=function(n){if(n&&n.id)return n.id;throw new Error("Invalid mode")},a.isValid=function(n){return n&&n.bit&&n.ccBits};function r(t){if(typeof t!="string")throw new Error("Param is not a string");switch(t.toLowerCase()){case"numeric":return a.NUMERIC;case"alphanumeric":return a.ALPHANUMERIC;case"kanji":return a.KANJI;case"byte":return a.BYTE;default:throw new Error("Unknown mode: "+t)}}a.from=function(n,c){if(a.isValid(n))return n;try{return r(n)}catch{return c}}})(Se)),Se}var st;function Jt(){return st||(st=1,(function(a){const o=ie(),i=wt(),r=Fe(),t=se(),n=Ct(),c=7973,h=o.getBCHDigit(c);function l(S,M,F){for(let D=1;D<=40;D++)if(M<=a.getCapacity(D,F,S))return D}function g(S,M){return t.getCharCountIndicator(S,M)+4}function v(S,M){let F=0;return S.forEach(function(D){const _=g(D.mode,M);F+=_+D.getBitsLength()}),F}function x(S,M){for(let F=1;F<=40;F++)if(v(S,F)<=a.getCapacity(F,M,t.MIXED))return F}a.from=function(M,F){return n.isValid(M)?parseInt(M,10):F},a.getCapacity=function(M,F,D){if(!n.isValid(M))throw new Error("Invalid QR Code version");typeof D>"u"&&(D=t.BYTE);const _=o.getSymbolTotalCodewords(M),z=i.getTotalCodewordsCount(M,F),j=(_-z)*8;if(D===t.MIXED)return j;const I=j-g(D,M);switch(D){case t.NUMERIC:return Math.floor(I/10*3);case t.ALPHANUMERIC:return Math.floor(I/11*2);case t.KANJI:return Math.floor(I/13);case t.BYTE:default:return Math.floor(I/8)}},a.getBestVersionForData=function(M,F){let D;const _=r.from(F,r.M);if(Array.isArray(M)){if(M.length>1)return x(M,_);if(M.length===0)return 1;D=M[0]}else D=M;return l(D.mode,D.getLength(),_)},a.getEncodedBits=function(M){if(!n.isValid(M)||M<7)throw new Error("Invalid QR Code version");let F=M<<12;for(;o.getBCHDigit(F)-h>=0;)F^=c<<o.getBCHDigit(F)-h;return M<<12|F}})(Re)),Re}var Be={},ct;function Gt(){if(ct)return Be;ct=1;const a=ie(),o=1335,i=21522,r=a.getBCHDigit(o);return Be.getEncodedBits=function(n,c){const h=n.bit<<3|c;let l=h<<10;for(;a.getBCHDigit(l)-r>=0;)l^=o<<a.getBCHDigit(l)-r;return(h<<10|l)^i},Be}var Te={},Pe,ut;function Wt(){if(ut)return Pe;ut=1;const a=se();function o(i){this.mode=a.NUMERIC,this.data=i.toString()}return o.getBitsLength=function(r){return 10*Math.floor(r/3)+(r%3?r%3*3+1:0)},o.prototype.getLength=function(){return this.data.length},o.prototype.getBitsLength=function(){return o.getBitsLength(this.data.length)},o.prototype.write=function(r){let t,n,c;for(t=0;t+3<=this.data.length;t+=3)n=this.data.substr(t,3),c=parseInt(n,10),r.put(c,10);const h=this.data.length-t;h>0&&(n=this.data.substr(t),c=parseInt(n,10),r.put(c,h*3+1))},Pe=o,Pe}var xe,lt;function Yt(){if(lt)return xe;lt=1;const a=se(),o=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function i(r){this.mode=a.ALPHANUMERIC,this.data=r}return i.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(t){let n;for(n=0;n+2<=this.data.length;n+=2){let c=o.indexOf(this.data[n])*45;c+=o.indexOf(this.data[n+1]),t.put(c,11)}this.data.length%2&&t.put(o.indexOf(this.data[n]),6)},xe=i,xe}var Ie,ht;function Qt(){if(ht)return Ie;ht=1;const a=se();function o(i){this.mode=a.BYTE,typeof i=="string"?this.data=new TextEncoder().encode(i):this.data=new Uint8Array(i)}return o.getBitsLength=function(r){return r*8},o.prototype.getLength=function(){return this.data.length},o.prototype.getBitsLength=function(){return o.getBitsLength(this.data.length)},o.prototype.write=function(i){for(let r=0,t=this.data.length;r<t;r++)i.put(this.data[r],8)},Ie=o,Ie}var Le,dt;function Xt(){if(dt)return Le;dt=1;const a=se(),o=ie();function i(r){this.mode=a.KANJI,this.data=r}return i.getBitsLength=function(t){return t*13},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(r){let t;for(t=0;t<this.data.length;t++){let n=o.toSJIS(this.data[t]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),r.put(n,13)}},Le=i,Le}var Ne={exports:{}},ft;function er(){return ft||(ft=1,(function(a){var o={single_source_shortest_paths:function(i,r,t){var n={},c={};c[r]=0;var h=o.PriorityQueue.make();h.push(r,0);for(var l,g,v,x,S,M,F,D,_;!h.empty();){l=h.pop(),g=l.value,x=l.cost,S=i[g]||{};for(v in S)S.hasOwnProperty(v)&&(M=S[v],F=x+M,D=c[v],_=typeof c[v]>"u",(_||D>F)&&(c[v]=F,h.push(v,F),n[v]=g))}if(typeof t<"u"&&typeof c[t]>"u"){var z=["Could not find a path from ",r," to ",t,"."].join("");throw new Error(z)}return n},extract_shortest_path_from_predecessor_list:function(i,r){for(var t=[],n=r;n;)t.push(n),i[n],n=i[n];return t.reverse(),t},find_path:function(i,r,t){var n=o.single_source_shortest_paths(i,r,t);return o.extract_shortest_path_from_predecessor_list(n,t)},PriorityQueue:{make:function(i){var r=o.PriorityQueue,t={},n;i=i||{};for(n in r)r.hasOwnProperty(n)&&(t[n]=r[n]);return t.queue=[],t.sorter=i.sorter||r.default_sorter,t},default_sorter:function(i,r){return i.cost-r.cost},push:function(i,r){var t={value:i,cost:r};this.queue.push(t),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};a.exports=o})(Ne)),Ne.exports}var yt;function tr(){return yt||(yt=1,(function(a){const o=se(),i=Wt(),r=Yt(),t=Qt(),n=Xt(),c=bt(),h=ie(),l=er();function g(z){return unescape(encodeURIComponent(z)).length}function v(z,j,I){const N=[];let $;for(;($=z.exec(I))!==null;)N.push({data:$[0],index:$.index,mode:j,length:$[0].length});return N}function x(z){const j=v(c.NUMERIC,o.NUMERIC,z),I=v(c.ALPHANUMERIC,o.ALPHANUMERIC,z);let N,$;return h.isKanjiModeEnabled()?(N=v(c.BYTE,o.BYTE,z),$=v(c.KANJI,o.KANJI,z)):(N=v(c.BYTE_KANJI,o.BYTE,z),$=[]),j.concat(I,N,$).sort(function(T,A){return T.index-A.index}).map(function(T){return{data:T.data,mode:T.mode,length:T.length}})}function S(z,j){switch(j){case o.NUMERIC:return i.getBitsLength(z);case o.ALPHANUMERIC:return r.getBitsLength(z);case o.KANJI:return n.getBitsLength(z);case o.BYTE:return t.getBitsLength(z)}}function M(z){return z.reduce(function(j,I){const N=j.length-1>=0?j[j.length-1]:null;return N&&N.mode===I.mode?(j[j.length-1].data+=I.data,j):(j.push(I),j)},[])}function F(z){const j=[];for(let I=0;I<z.length;I++){const N=z[I];switch(N.mode){case o.NUMERIC:j.push([N,{data:N.data,mode:o.ALPHANUMERIC,length:N.length},{data:N.data,mode:o.BYTE,length:N.length}]);break;case o.ALPHANUMERIC:j.push([N,{data:N.data,mode:o.BYTE,length:N.length}]);break;case o.KANJI:j.push([N,{data:N.data,mode:o.BYTE,length:g(N.data)}]);break;case o.BYTE:j.push([{data:N.data,mode:o.BYTE,length:g(N.data)}])}}return j}function D(z,j){const I={},N={start:{}};let $=["start"];for(let w=0;w<z.length;w++){const T=z[w],A=[];for(let C=0;C<T.length;C++){const L=T[C],B=""+w+C;A.push(B),I[B]={node:L,lastCount:0},N[B]={};for(let P=0;P<$.length;P++){const E=$[P];I[E]&&I[E].node.mode===L.mode?(N[E][B]=S(I[E].lastCount+L.length,L.mode)-S(I[E].lastCount,L.mode),I[E].lastCount+=L.length):(I[E]&&(I[E].lastCount=L.length),N[E][B]=S(L.length,L.mode)+4+o.getCharCountIndicator(L.mode,j))}}$=A}for(let w=0;w<$.length;w++)N[$[w]].end=0;return{map:N,table:I}}function _(z,j){let I;const N=o.getBestModeForData(z);if(I=o.from(j,N),I!==o.BYTE&&I.bit<N.bit)throw new Error('"'+z+'" cannot be encoded with mode '+o.toString(I)+`.
 Suggested mode is: `+o.toString(N));switch(I===o.KANJI&&!h.isKanjiModeEnabled()&&(I=o.BYTE),I){case o.NUMERIC:return new i(z);case o.ALPHANUMERIC:return new r(z);case o.KANJI:return new n(z);case o.BYTE:return new t(z)}}a.fromArray=function(j){return j.reduce(function(I,N){return typeof N=="string"?I.push(_(N,null)):N.data&&I.push(_(N.data,N.mode)),I},[])},a.fromString=function(j,I){const N=x(j,h.isKanjiModeEnabled()),$=F(N),w=D($,I),T=l.find_path(w.map,"start","end"),A=[];for(let C=1;C<T.length-1;C++)A.push(w.table[T[C]].node);return a.fromArray(M(A))},a.rawSplit=function(j){return a.fromArray(x(j,h.isKanjiModeEnabled()))}})(Te)),Te}var gt;function rr(){if(gt)return pe;gt=1;const a=ie(),o=Fe(),i=jt(),r=Ut(),t=Vt(),n=Ht(),c=Ot(),h=wt(),l=Zt(),g=Jt(),v=Gt(),x=se(),S=tr();function M(w,T){const A=w.size,C=n.getPositions(T);for(let L=0;L<C.length;L++){const B=C[L][0],P=C[L][1];for(let E=-1;E<=7;E++)if(!(B+E<=-1||A<=B+E))for(let q=-1;q<=7;q++)P+q<=-1||A<=P+q||(E>=0&&E<=6&&(q===0||q===6)||q>=0&&q<=6&&(E===0||E===6)||E>=2&&E<=4&&q>=2&&q<=4?w.set(B+E,P+q,!0,!0):w.set(B+E,P+q,!1,!0))}}function F(w){const T=w.size;for(let A=8;A<T-8;A++){const C=A%2===0;w.set(A,6,C,!0),w.set(6,A,C,!0)}}function D(w,T){const A=t.getPositions(T);for(let C=0;C<A.length;C++){const L=A[C][0],B=A[C][1];for(let P=-2;P<=2;P++)for(let E=-2;E<=2;E++)P===-2||P===2||E===-2||E===2||P===0&&E===0?w.set(L+P,B+E,!0,!0):w.set(L+P,B+E,!1,!0)}}function _(w,T){const A=w.size,C=g.getEncodedBits(T);let L,B,P;for(let E=0;E<18;E++)L=Math.floor(E/3),B=E%3+A-8-3,P=(C>>E&1)===1,w.set(L,B,P,!0),w.set(B,L,P,!0)}function z(w,T,A){const C=w.size,L=v.getEncodedBits(T,A);let B,P;for(B=0;B<15;B++)P=(L>>B&1)===1,B<6?w.set(B,8,P,!0):B<8?w.set(B+1,8,P,!0):w.set(C-15+B,8,P,!0),B<8?w.set(8,C-B-1,P,!0):B<9?w.set(8,15-B-1+1,P,!0):w.set(8,15-B-1,P,!0);w.set(C-8,8,1,!0)}function j(w,T){const A=w.size;let C=-1,L=A-1,B=7,P=0;for(let E=A-1;E>0;E-=2)for(E===6&&E--;;){for(let q=0;q<2;q++)if(!w.isReserved(L,E-q)){let J=!1;P<T.length&&(J=(T[P]>>>B&1)===1),w.set(L,E-q,J),B--,B===-1&&(P++,B=7)}if(L+=C,L<0||A<=L){L-=C,C=-C;break}}}function I(w,T,A){const C=new i;A.forEach(function(q){C.put(q.mode.bit,4),C.put(q.getLength(),x.getCharCountIndicator(q.mode,w)),q.write(C)});const L=a.getSymbolTotalCodewords(w),B=h.getTotalCodewordsCount(w,T),P=(L-B)*8;for(C.getLengthInBits()+4<=P&&C.put(0,4);C.getLengthInBits()%8!==0;)C.putBit(0);const E=(P-C.getLengthInBits())/8;for(let q=0;q<E;q++)C.put(q%2?17:236,8);return N(C,w,T)}function N(w,T,A){const C=a.getSymbolTotalCodewords(T),L=h.getTotalCodewordsCount(T,A),B=C-L,P=h.getBlocksCount(T,A),E=C%P,q=P-E,J=Math.floor(C/P),X=Math.floor(B/P),Z=X+1,re=J-X,le=new l(re);let s=0;const e=new Array(P),u=new Array(P);let f=0;const m=new Uint8Array(w.buffer);for(let R=0;R<P;R++){const U=R<q?X:Z;e[R]=m.slice(s,s+U),u[R]=le.encode(e[R]),s+=U,f=Math.max(f,U)}const p=new Uint8Array(C);let b=0,y,k;for(y=0;y<f;y++)for(k=0;k<P;k++)y<e[k].length&&(p[b++]=e[k][y]);for(y=0;y<re;y++)for(k=0;k<P;k++)p[b++]=u[k][y];return p}function $(w,T,A,C){let L;if(Array.isArray(w))L=S.fromArray(w);else if(typeof w=="string"){let J=T;if(!J){const X=S.rawSplit(w);J=g.getBestVersionForData(X,A)}L=S.fromString(w,J||40)}else throw new Error("Invalid data");const B=g.getBestVersionForData(L,A);if(!B)throw new Error("The amount of data is too big to be stored in a QR Code");if(!T)T=B;else if(T<B)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+B+`.
`);const P=I(T,A,L),E=a.getSymbolSize(T),q=new r(E);return M(q,T),F(q),D(q,T),z(q,A,0),T>=7&&_(q,T),j(q,P),isNaN(C)&&(C=c.getBestMask(q,z.bind(null,q,A))),c.applyMask(C,q),z(q,A,C),{modules:q,version:T,errorCorrectionLevel:A,maskPattern:C,segments:L}}return pe.create=function(T,A){if(typeof T>"u"||T==="")throw new Error("No input text");let C=o.M,L,B;return typeof A<"u"&&(C=o.from(A.errorCorrectionLevel,o.M),L=g.from(A.version),B=c.from(A.maskPattern),A.toSJISFunc&&a.setToSJISFunction(A.toSJISFunc)),$(T,L,C,B)},pe}var qe={},_e={},pt;function Et(){return pt||(pt=1,(function(a){function o(i){if(typeof i=="number"&&(i=i.toString()),typeof i!="string")throw new Error("Color should be defined as hex string");let r=i.slice().replace("#","").split("");if(r.length<3||r.length===5||r.length>8)throw new Error("Invalid hex color: "+i);(r.length===3||r.length===4)&&(r=Array.prototype.concat.apply([],r.map(function(n){return[n,n]}))),r.length===6&&r.push("F","F");const t=parseInt(r.join(""),16);return{r:t>>24&255,g:t>>16&255,b:t>>8&255,a:t&255,hex:"#"+r.slice(0,6).join("")}}a.getOptions=function(r){r||(r={}),r.color||(r.color={});const t=typeof r.margin>"u"||r.margin===null||r.margin<0?4:r.margin,n=r.width&&r.width>=21?r.width:void 0,c=r.scale||4;return{width:n,scale:n?4:c,margin:t,color:{dark:o(r.color.dark||"#000000ff"),light:o(r.color.light||"#ffffffff")},type:r.type,rendererOpts:r.rendererOpts||{}}},a.getScale=function(r,t){return t.width&&t.width>=r+t.margin*2?t.width/(r+t.margin*2):t.scale},a.getImageWidth=function(r,t){const n=a.getScale(r,t);return Math.floor((r+t.margin*2)*n)},a.qrToImageData=function(r,t,n){const c=t.modules.size,h=t.modules.data,l=a.getScale(c,n),g=Math.floor((c+n.margin*2)*l),v=n.margin*l,x=[n.color.light,n.color.dark];for(let S=0;S<g;S++)for(let M=0;M<g;M++){let F=(S*g+M)*4,D=n.color.light;if(S>=v&&M>=v&&S<g-v&&M<g-v){const _=Math.floor((S-v)/l),z=Math.floor((M-v)/l);D=x[h[_*c+z]?1:0]}r[F++]=D.r,r[F++]=D.g,r[F++]=D.b,r[F]=D.a}}})(_e)),_e}var mt;function nr(){return mt||(mt=1,(function(a){const o=Et();function i(t,n,c){t.clearRect(0,0,n.width,n.height),n.style||(n.style={}),n.height=c,n.width=c,n.style.height=c+"px",n.style.width=c+"px"}function r(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}a.render=function(n,c,h){let l=h,g=c;typeof l>"u"&&(!c||!c.getContext)&&(l=c,c=void 0),c||(g=r()),l=o.getOptions(l);const v=o.getImageWidth(n.modules.size,l),x=g.getContext("2d"),S=x.createImageData(v,v);return o.qrToImageData(S.data,n,l),i(x,g,v),x.putImageData(S,0,0),g},a.renderToDataURL=function(n,c,h){let l=h;typeof l>"u"&&(!c||!c.getContext)&&(l=c,c=void 0),l||(l={});const g=a.render(n,c,l),v=l.type||"image/png",x=l.rendererOpts||{};return g.toDataURL(v,x.quality)}})(qe)),qe}var ze={},kt;function ar(){if(kt)return ze;kt=1;const a=Et();function o(t,n){const c=t.a/255,h=n+'="'+t.hex+'"';return c<1?h+" "+n+'-opacity="'+c.toFixed(2).slice(1)+'"':h}function i(t,n,c){let h=t+n;return typeof c<"u"&&(h+=" "+c),h}function r(t,n,c){let h="",l=0,g=!1,v=0;for(let x=0;x<t.length;x++){const S=Math.floor(x%n),M=Math.floor(x/n);!S&&!g&&(g=!0),t[x]?(v++,x>0&&S>0&&t[x-1]||(h+=g?i("M",S+c,.5+M+c):i("m",l,0),l=0,g=!1),S+1<n&&t[x+1]||(h+=i("h",v),v=0)):l++}return h}return ze.render=function(n,c,h){const l=a.getOptions(c),g=n.modules.size,v=n.modules.data,x=g+l.margin*2,S=l.color.light.a?"<path "+o(l.color.light,"fill")+' d="M0 0h'+x+"v"+x+'H0z"/>':"",M="<path "+o(l.color.dark,"stroke")+' d="'+r(v,g,l.margin)+'"/>',F='viewBox="0 0 '+x+" "+x+'"',_='<svg xmlns="http://www.w3.org/2000/svg" '+(l.width?'width="'+l.width+'" height="'+l.width+'" ':"")+F+' shape-rendering="crispEdges">'+S+M+`</svg>
`;return typeof h=="function"&&h(null,_),_},ze}var vt;function Un(){if(vt)return ce;vt=1;const a=Dt(),o=rr(),i=nr(),r=ar();function t(n,c,h,l,g){const v=[].slice.call(arguments,1),x=v.length,S=typeof v[x-1]=="function";if(!S&&!a())throw new Error("Callback required as last argument");if(S){if(x<2)throw new Error("Too few arguments provided");x===2?(g=h,h=c,c=l=void 0):x===3&&(c.getContext&&typeof g>"u"?(g=l,l=void 0):(g=l,l=h,h=c,c=void 0))}else{if(x<1)throw new Error("Too few arguments provided");return x===1?(h=c,c=l=void 0):x===2&&!c.getContext&&(l=h,h=c,c=void 0),new Promise(function(M,F){try{const D=o.create(h,l);M(n(D,c,l))}catch(D){F(D)}})}try{const M=o.create(h,l);g(null,n(M,c,l))}catch(M){g(M)}}return ce.create=o.create,ce.toCanvas=t.bind(null,i.render),ce.toDataURL=t.bind(null,i.renderToDataURL),ce.toString=t.bind(null,function(n,c,h){return r.render(n,h)}),ce}var De={};(function a(o,i,r,t){var n=!!(o.Worker&&o.Blob&&o.Promise&&o.OffscreenCanvas&&o.OffscreenCanvasRenderingContext2D&&o.HTMLCanvasElement&&o.HTMLCanvasElement.prototype.transferControlToOffscreen&&o.URL&&o.URL.createObjectURL),c=typeof Path2D=="function"&&typeof DOMMatrix=="function",h=(function(){if(!o.OffscreenCanvas)return!1;try{var s=new OffscreenCanvas(1,1),e=s.getContext("2d");e.fillRect(0,0,1,1);var u=s.transferToImageBitmap();e.createPattern(u,"no-repeat")}catch{return!1}return!0})();function l(){}function g(s){var e=i.exports.Promise,u=e!==void 0?e:o.Promise;return typeof u=="function"?new u(s):(s(l,l),null)}var v=(function(s,e){return{transform:function(u){if(s)return u;if(e.has(u))return e.get(u);var f=new OffscreenCanvas(u.width,u.height),m=f.getContext("2d");return m.drawImage(u,0,0),e.set(u,f),f},clear:function(){e.clear()}}})(h,new Map),x=(function(){var s=Math.floor(16.666666666666668),e,u,f={},m=0;return typeof requestAnimationFrame=="function"&&typeof cancelAnimationFrame=="function"?(e=function(p){var b=Math.random();return f[b]=requestAnimationFrame(function y(k){m===k||m+s-1<k?(m=k,delete f[b],p()):f[b]=requestAnimationFrame(y)}),b},u=function(p){f[p]&&cancelAnimationFrame(f[p])}):(e=function(p){return setTimeout(p,s)},u=function(p){return clearTimeout(p)}),{frame:e,cancel:u}})(),S=(function(){var s,e,u={};function f(m){function p(b,y){m.postMessage({options:b||{},callback:y})}m.init=function(y){var k=y.transferControlToOffscreen();m.postMessage({canvas:k},[k])},m.fire=function(y,k,R){if(e)return p(y,null),e;var U=Math.random().toString(36).slice(2);return e=g(function(O){function K(G){G.data.callback===U&&(delete u[U],m.removeEventListener("message",K),e=null,v.clear(),R(),O())}m.addEventListener("message",K),p(y,U),u[U]=K.bind(null,{data:{callback:U}})}),e},m.reset=function(){m.postMessage({reset:!0});for(var y in u)u[y](),delete u[y]}}return function(){if(s)return s;if(!r&&n){var m=["var CONFETTI, SIZE = {}, module = {};","("+a.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join(`
`);try{s=new Worker(URL.createObjectURL(new Blob([m])))}catch(p){return typeof console<"u"&&typeof console.warn=="function"&&console.warn("🎊 Could not load worker",p),null}f(s)}return s}})(),M={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function F(s,e){return e?e(s):s}function D(s){return s!=null}function _(s,e,u){return F(s&&D(s[e])?s[e]:M[e],u)}function z(s){return s<0?0:Math.floor(s)}function j(s,e){return Math.floor(Math.random()*(e-s))+s}function I(s){return parseInt(s,16)}function N(s){return s.map($)}function $(s){var e=String(s).replace(/[^0-9a-f]/gi,"");return e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),{r:I(e.substring(0,2)),g:I(e.substring(2,4)),b:I(e.substring(4,6))}}function w(s){var e=_(s,"origin",Object);return e.x=_(e,"x",Number),e.y=_(e,"y",Number),e}function T(s){s.width=document.documentElement.clientWidth,s.height=document.documentElement.clientHeight}function A(s){var e=s.getBoundingClientRect();s.width=e.width,s.height=e.height}function C(s){var e=document.createElement("canvas");return e.style.position="fixed",e.style.top="0px",e.style.left="0px",e.style.pointerEvents="none",e.style.zIndex=s,e}function L(s,e,u,f,m,p,b,y,k){s.save(),s.translate(e,u),s.rotate(p),s.scale(f,m),s.arc(0,0,1,b,y,k),s.restore()}function B(s){var e=s.angle*(Math.PI/180),u=s.spread*(Math.PI/180);return{x:s.x,y:s.y,wobble:Math.random()*10,wobbleSpeed:Math.min(.11,Math.random()*.1+.05),velocity:s.startVelocity*.5+Math.random()*s.startVelocity,angle2D:-e+(.5*u-Math.random()*u),tiltAngle:(Math.random()*(.75-.25)+.25)*Math.PI,color:s.color,shape:s.shape,tick:0,totalTicks:s.ticks,decay:s.decay,drift:s.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:s.gravity*3,ovalScalar:.6,scalar:s.scalar,flat:s.flat}}function P(s,e){e.x+=Math.cos(e.angle2D)*e.velocity+e.drift,e.y+=Math.sin(e.angle2D)*e.velocity+e.gravity,e.velocity*=e.decay,e.flat?(e.wobble=0,e.wobbleX=e.x+10*e.scalar,e.wobbleY=e.y+10*e.scalar,e.tiltSin=0,e.tiltCos=0,e.random=1):(e.wobble+=e.wobbleSpeed,e.wobbleX=e.x+10*e.scalar*Math.cos(e.wobble),e.wobbleY=e.y+10*e.scalar*Math.sin(e.wobble),e.tiltAngle+=.1,e.tiltSin=Math.sin(e.tiltAngle),e.tiltCos=Math.cos(e.tiltAngle),e.random=Math.random()+2);var u=e.tick++/e.totalTicks,f=e.x+e.random*e.tiltCos,m=e.y+e.random*e.tiltSin,p=e.wobbleX+e.random*e.tiltCos,b=e.wobbleY+e.random*e.tiltSin;if(s.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-u)+")",s.beginPath(),c&&e.shape.type==="path"&&typeof e.shape.path=="string"&&Array.isArray(e.shape.matrix))s.fill(Z(e.shape.path,e.shape.matrix,e.x,e.y,Math.abs(p-f)*.1,Math.abs(b-m)*.1,Math.PI/10*e.wobble));else if(e.shape.type==="bitmap"){var y=Math.PI/10*e.wobble,k=Math.abs(p-f)*.1,R=Math.abs(b-m)*.1,U=e.shape.bitmap.width*e.scalar,O=e.shape.bitmap.height*e.scalar,K=new DOMMatrix([Math.cos(y)*k,Math.sin(y)*k,-Math.sin(y)*R,Math.cos(y)*R,e.x,e.y]);K.multiplySelf(new DOMMatrix(e.shape.matrix));var G=s.createPattern(v.transform(e.shape.bitmap),"no-repeat");G.setTransform(K),s.globalAlpha=1-u,s.fillStyle=G,s.fillRect(e.x-U/2,e.y-O/2,U,O),s.globalAlpha=1}else if(e.shape==="circle")s.ellipse?s.ellipse(e.x,e.y,Math.abs(p-f)*e.ovalScalar,Math.abs(b-m)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI):L(s,e.x,e.y,Math.abs(p-f)*e.ovalScalar,Math.abs(b-m)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI);else if(e.shape==="star")for(var H=Math.PI/2*3,W=4*e.scalar,Y=8*e.scalar,Q=e.x,ne=e.y,oe=5,ee=Math.PI/oe;oe--;)Q=e.x+Math.cos(H)*Y,ne=e.y+Math.sin(H)*Y,s.lineTo(Q,ne),H+=ee,Q=e.x+Math.cos(H)*W,ne=e.y+Math.sin(H)*W,s.lineTo(Q,ne),H+=ee;else s.moveTo(Math.floor(e.x),Math.floor(e.y)),s.lineTo(Math.floor(e.wobbleX),Math.floor(m)),s.lineTo(Math.floor(p),Math.floor(b)),s.lineTo(Math.floor(f),Math.floor(e.wobbleY));return s.closePath(),s.fill(),e.tick<e.totalTicks}function E(s,e,u,f,m){var p=e.slice(),b=s.getContext("2d"),y,k,R=g(function(U){function O(){y=k=null,b.clearRect(0,0,f.width,f.height),v.clear(),m(),U()}function K(){r&&!(f.width===t.width&&f.height===t.height)&&(f.width=s.width=t.width,f.height=s.height=t.height),!f.width&&!f.height&&(u(s),f.width=s.width,f.height=s.height),b.clearRect(0,0,f.width,f.height),p=p.filter(function(G){return P(b,G)}),p.length?y=x.frame(K):O()}y=x.frame(K),k=O});return{addFettis:function(U){return p=p.concat(U),R},canvas:s,promise:R,reset:function(){y&&x.cancel(y),k&&k()}}}function q(s,e){var u=!s,f=!!_(e||{},"resize"),m=!1,p=_(e,"disableForReducedMotion",Boolean),b=n&&!!_(e||{},"useWorker"),y=b?S():null,k=u?T:A,R=s&&y?!!s.__confetti_initialized:!1,U=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion)").matches,O;function K(H,W,Y){for(var Q=_(H,"particleCount",z),ne=_(H,"angle",Number),oe=_(H,"spread",Number),ee=_(H,"startVelocity",Number),Rt=_(H,"decay",Number),St=_(H,"gravity",Number),At=_(H,"drift",Number),je=_(H,"colors",N),Bt=_(H,"ticks",Number),Ue=_(H,"shapes"),Tt=_(H,"scalar"),Pt=!!_(H,"flat"),Ve=w(H),He=Q,fe=[],xt=s.width*Ve.x,It=s.height*Ve.y;He--;)fe.push(B({x:xt,y:It,angle:ne,spread:oe,startVelocity:ee,color:je[He%je.length],shape:Ue[j(0,Ue.length)],ticks:Bt,decay:Rt,gravity:St,drift:At,scalar:Tt,flat:Pt}));return O?O.addFettis(fe):(O=E(s,fe,k,W,Y),O.promise)}function G(H){var W=p||_(H,"disableForReducedMotion",Boolean),Y=_(H,"zIndex",Number);if(W&&U)return g(function(ee){ee()});u&&O?s=O.canvas:u&&!s&&(s=C(Y),document.body.appendChild(s)),f&&!R&&k(s);var Q={width:s.width,height:s.height};y&&!R&&y.init(s),R=!0,y&&(s.__confetti_initialized=!0);function ne(){if(y){var ee={getBoundingClientRect:function(){if(!u)return s.getBoundingClientRect()}};k(ee),y.postMessage({resize:{width:ee.width,height:ee.height}});return}Q.width=Q.height=null}function oe(){O=null,f&&(m=!1,o.removeEventListener("resize",ne)),u&&s&&(document.body.contains(s)&&document.body.removeChild(s),s=null,R=!1)}return f&&!m&&(m=!0,o.addEventListener("resize",ne,!1)),y?y.fire(H,Q,oe):K(H,Q,oe)}return G.reset=function(){y&&y.reset(),O&&O.reset()},G}var J;function X(){return J||(J=q(null,{useWorker:!0,resize:!0})),J}function Z(s,e,u,f,m,p,b){var y=new Path2D(s),k=new Path2D;k.addPath(y,new DOMMatrix(e));var R=new Path2D;return R.addPath(k,new DOMMatrix([Math.cos(b)*m,Math.sin(b)*m,-Math.sin(b)*p,Math.cos(b)*p,u,f])),R}function re(s){if(!c)throw new Error("path confetti are not supported in this browser");var e,u;typeof s=="string"?e=s:(e=s.path,u=s.matrix);var f=new Path2D(e),m=document.createElement("canvas"),p=m.getContext("2d");if(!u){for(var b=1e3,y=b,k=b,R=0,U=0,O,K,G=0;G<b;G+=2)for(var H=0;H<b;H+=2)p.isPointInPath(f,G,H,"nonzero")&&(y=Math.min(y,G),k=Math.min(k,H),R=Math.max(R,G),U=Math.max(U,H));O=R-y,K=U-k;var W=10,Y=Math.min(W/O,W/K);u=[Y,0,0,Y,-Math.round(O/2+y)*Y,-Math.round(K/2+k)*Y]}return{type:"path",path:e,matrix:u}}function le(s){var e,u=1,f="#000000",m='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';typeof s=="string"?e=s:(e=s.text,u="scalar"in s?s.scalar:u,m="fontFamily"in s?s.fontFamily:m,f="color"in s?s.color:f);var p=10*u,b=""+p+"px "+m,y=new OffscreenCanvas(p,p),k=y.getContext("2d");k.font=b;var R=k.measureText(e),U=Math.ceil(R.actualBoundingBoxRight+R.actualBoundingBoxLeft),O=Math.ceil(R.actualBoundingBoxAscent+R.actualBoundingBoxDescent),K=2,G=R.actualBoundingBoxLeft+K,H=R.actualBoundingBoxAscent+K;U+=K+K,O+=K+K,y=new OffscreenCanvas(U,O),k=y.getContext("2d"),k.font=b,k.fillStyle=f,k.fillText(e,G,H);var W=1/u;return{type:"bitmap",bitmap:y.transferToImageBitmap(),matrix:[W,0,0,W,-U*W/2,-O*W/2]}}i.exports=function(){return X().apply(this,arguments)},i.exports.reset=function(){X().reset()},i.exports.create=q,i.exports.shapeFromPath=re,i.exports.shapeFromText=le})((function(){return typeof window<"u"?window:typeof self<"u"?self:this||{}})(),De,!1);const Vn=De.exports;De.exports.create;export{sn as $,Lr as A,ur as B,gr as C,Cr as D,Rr as E,Tr as F,Ir as G,Nr as H,yr as I,fr as J,Dr as K,Vr as L,Jr as M,vn as N,dr as O,Xr as P,Hr as Q,or as R,dn as S,wn as T,In as U,_n as V,sr as W,Dn as X,kn as Y,jn as Z,kr as _,ue as a,Zr as a0,Kr as a1,jr as a2,Fn as a3,zn as a4,An as a5,Sn as a6,Nn as a7,qn as a8,ir as a9,Fr as aA,Vn as aB,nn as aC,xn as aD,tn as aa,pr as ab,Or as ac,Yr as ad,Pr as ae,Er as af,Cn as ag,xr as ah,En as ai,an as aj,wr as ak,Un as al,Ar as am,en as an,bn as ao,ln as ap,Ur as aq,lr as ar,rn as as,mr as at,on as au,Tn as av,Pn as aw,hr as ax,_r as ay,mn as az,Mn as b,gn as c,fn as d,yn as e,Wr as f,Lt as g,br as h,qr as i,Ln as j,Br as k,Bn as l,hn as m,Rn as n,vr as o,Qr as p,Mr as q,qt as r,cr as s,un as t,cn as u,Sr as v,Gr as w,$r as x,pn as y,zr as z};
