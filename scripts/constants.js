/**
 * Module-based constants
 */
export const MODULE = {
  ID: 'token-action-hud-uft'
}

/**
 * Core module
 */
export const CORE_MODULE = {
  ID: 'token-action-hud-core'
}

/**
 * Core module version required by the system module
 */
export const REQUIRED_CORE_MODULE_VERSION = '1.5'

/**
 * Action types
 */
export const ACTION_TYPE = {
  item: 'tokenActionHud.uft.item',
  utility: 'tokenActionHud.utility',
  combat: 'tokenActionHud.uft.attack'
}

/**
 * Groups
 */
export const GROUP = {
  // inventory item types
  weapons: { id: 'weapons', name: 'tokenActionHud.uft.inventory.weapons', type: 'system' },
  armor: { id: 'armor', name: 'tokenActionHud.uft.inventory.armor', type: 'system' },
  containers: { id: 'containers', name: 'tokenActionHud.uft.inventory.containers', type: 'system', nestId: 'inventory_containers', settings: { style: 'tab' } },
  items: { id: 'items', name: 'tokenActionHud.uft.inventory.items', type: 'system' },
  treasure: { id: 'treasure', name: 'tokenActionHud.uft.inventory.treasure', type: 'system' },
  // spells
  spells: { id: 'spells', name: 'tokenActionHud.uft.spells', type: 'system' },
  // abilities
  explorationSkills: { id: 'exploration', name: 'tokenActionHud.uft.abilities.exploration', type: 'system'  },
  rolledAbilities: { id: 'rolled', name: 'tokenActionHud.uft.abilities.rollable', type: 'system' },
  miscAbilities: { id: 'misc', name: 'tokenActionHud.uft.abilities.misc', type: 'system' },
  // checks/saves
  abilitychecks: { id: 'abilitychecks', name: 'tokenActionHud.uft.checks.abilitychecks', type: 'system' },
  saves: { id: 'saves', name: 'tokenActionHud.uft.checks.saves', type: 'system' },
  // generic types
  combat: { id: 'combat', name: 'tokenActionHud.combat', type: 'system' },
  token: { id: 'token', name: 'tokenActionHud.token', type: 'system' },
  utility: { id: 'utility', name: 'tokenActionHud.utility', type: 'system' }
}

/**
 * Item types
 */
export const ITEM_TYPE = {
  weapons: { groupId: 'weapons' },
  armor: { groupId: 'armor' },
  containers: { groupId: 'containers' },
  items: { groupId: 'items' },
  treasure: { groupId: 'treasure' },
  // abilities: { groupId: 'abilities' },
  rolledAbilities: { groupId: 'rolled' },
  miscAbilities: { groupId: 'misc' },
  spells: { groupId: 'spells' }
}
