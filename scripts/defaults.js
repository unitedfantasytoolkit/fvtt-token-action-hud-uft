import { GROUP } from './constants.js'

/**
 * Default layout and groups
 */
export let DEFAULTS = null

// eslint-disable-next-line no-undef
Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
  const groups = GROUP
  Object.values(groups).forEach(group => {
    group.name = coreModule.api.Utils.i18n(group.name)
    group.listName = `Group: ${coreModule.api.Utils.i18n(group.listName ?? group.name)}`
  })
  const groupsArray = Object.values(groups)
  DEFAULTS = {
    layout: [
      {
        nestId: 'inventory',
        id: 'inventory',
        name: coreModule.api.Utils.i18n('tokenActionHud.uft.inventory.label'),
      },
      {
        nestId: 'abilities',
        id: 'abilities',
        name: coreModule.api.Utils.i18n('tokenActionHud.uft.abilities.label'),
        settings: {
          style: "tab"
        },
      },
      {
        nestId: 'spells',
        id: 'spells',
        name: coreModule.api.Utils.i18n('tokenActionHud.uft.spells.label'),
      },
      {
        id: 'checks',
        nestId: 'checks',
        name: coreModule.api.Utils.i18n('tokenActionHud.uft.checks.label'),
        settings: {
          style: "tab"
        },
      },
      {
        nestId: 'utility',
        id: 'utility',
        name: coreModule.api.Utils.i18n('tokenActionHud.utility'),
        groups: [
          { ...groups.combat, nestId: 'utility_combat' },
          { ...groups.token, nestId: 'utility_token' },
          { ...groups.utility, nestId: 'utility_utility' }
        ]
      }
    ],
    groups: groupsArray
  }
})
