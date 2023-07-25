import { SystemManager } from './system-manager.js'
import { MODULE, REQUIRED_CORE_MODULE_VERSION } from './constants.js'

Hooks.once('devModeReady', () => {
  // Only add this script for livereload if we're using Developer Mode
  // (https://github.com/League-of-Foundry-Developers/foundryvtt-devMode)
  const src = `http://${(location.host || 'localhost').split(':')[0]}:9999/livereload.js?snipver=1`
  const script = document.createElement('script');
  script.src = src;

  document.body.appendChild(script);
});

Hooks.on('tokenActionHudCoreApiReady', async () => {
  /**
   * Return the SystemManager and requiredCoreModuleVersion to Token Action HUD Core
   */
  const module = game.modules.get(MODULE.ID)
  module.api = {
    requiredCoreModuleVersion: REQUIRED_CORE_MODULE_VERSION,
    SystemManager
  }
  Hooks.call('tokenActionHudSystemReady', module)
})
