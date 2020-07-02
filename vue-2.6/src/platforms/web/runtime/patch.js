/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index' //针对平台的属性

// the directive module should be applied last, after all
// built-in modules have been applied.
// baseModules 
const modules = platformModules.concat(baseModules)

// nodeOps定义节点的怎删改
// modules 属性增删改 
export const patch: Function = createPatchFunction({ nodeOps, modules })
