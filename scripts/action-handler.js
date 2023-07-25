// System Module Imports
import { ACTION_TYPE, ITEM_TYPE, GROUP } from './constants.js'
import { Utils } from './utils.js'

export let ActionHandler = null

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
  /**
   * Extends Token Action HUD Core's ActionHandler class and builds system-defined actions for the HUD
   */
  ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
    /**
     * Build system actions
     * Called by Token Action HUD Core
     * @override
     * @param {array} groupIds
     */a
    async buildSystemActions (groupIds) {
      // Set actor and token variables
      this.actors = (!this.actor) ? this._getActors() : [this.actor]
      this.actorType = this.actor?.type

      // Set items variable
      if (this.actor) {
        // let items = this.actor.items
        // items = coreModule.api.Utils.sortItemsByName(items)
        // this.items = items
      }

      /**
       * @todo Handle monsters
       */
      if (this.actorType === 'character') {
        this.#buildCharacterActions()
      } else if (!this.actor) {
        this.#buildMultipleTokenActions()
      }
    }

    /**
     * Build character actions
     * @todo Add exploration skill actions
     * @todo Add spells actions (for spellcasters only)
     * @private
     */
    #buildCharacterActions () {
      this.#buildItemList()
      // this.#buildContainers()
      this.#buildAbilityCheckList()
      this.#buildExplorationSkilleList () 
      this.#buildSaveList()
      this.#buildAbilitiesList()
      if (this.actor.system.spells.enabled) {
        this.#buildSpellsList()
      } else {
        this.removeGroup({ id: 'spells' })
      }

      this.updateGroup({ id: "abilities", settings: { style: 'tab' }})
    }

    #itemToAction ([itemId, itemData]) {
      const isConsumableItem = itemData.system?.quantity?.max;
      const isSpellWithMultipleMemorizations = itemData.system?.cast > 1

      let current, max, info;

      if (isConsumableItem) {
        current = itemData.system.quantity.value;
        max = itemData.system.quantity.max;
      }

      if (isSpellWithMultipleMemorizations) {
        current = itemData.system.cast;
        max = itemData.system.memorized;
      }

      if (
        !Number.isNaN(current) && current > 1 &&
        !Number.isNaN(max) &&  max > 1
      ) {
        info = { text: `${current}/${max}` }
      }
      
      return this.#toAction(itemId, itemData, 'item', info)
    }

    #toAction (itemId, itemData, actionTypeId, info) {
      const id = itemId
      const name = itemData.name
      const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE[actionTypeId])
      const listName = `${actionTypeName ? `${actionTypeName}: ` : ''}${name}`
      const encodedValue = [actionTypeId, id].join(this.delimiter)
      const img = coreModule.api.Utils.getImage(itemData.img)
      const equipped =
        Utils.getSetting('displayUnequipped') &&
        (itemData.type === 'weapon' || itemData.type === 'armor') &&
        itemData.system.equipped
      const cssClass = `${equipped ? 'active ' : ''}`.trim()
      const info1 = info
      return { id, name, listName, encodedValue, img, cssClass, info1 }
    }

    #assignActions (type, typeMap) {
      const groupId = ITEM_TYPE[type]?.groupId
      if (!groupId) return
      const groupData = { id: groupId, type: 'system' }
      const actions = [...typeMap].map(this.#itemToAction.bind(this))

      this.addActions(actions, groupData)
    }

    #buildItemList () {
      const shouldDisplayUnequipped = Utils.getSetting('displayUnequipped')
      const isEqupped = (item) => item.system.equipped
      const isContained = (item) => !!item.system.containerId
      const toMap = (map, item) => {
        if (
          !isContained(item) &&
          (shouldDisplayUnequipped || isEqupped(item))
        ) map.set(item.id, item)
        return map
      }

      this.#assignActions(
        'weapons',
        this.actor.system.weapons.reduce(toMap, new Map())
      )
      this.#assignActions(
        'armor',
        this.actor.system.armor.reduce(toMap, new Map())
      )
      this.#assignActions(
        'items',
        this.actor.system.items.filter(i => !!i.system.quantity.max && !!i.system.quantity.value).reduce(toMap, new Map())
      )
    }

    #buildContainers () {
      this.actor.system.containers
        .filter(i => !!i.system.contents.length)
        .forEach((container) => {
          const contents = container.system.contents
            .reduce((map, item) => map.set(item.id, item), new Map())
          const groupData = {
            id: container.id,
            name: container.name,
            type: 'system',
            nestId: 'inventory_container'
          }
          const parentGroupData = { id: 'containers', nestId: 'inventory' }
          const nestGroupData = { id: groupData.id, nestId: groupData.nestId }
          this.addGroup(groupData, parentGroupData)
          this.addActions(
            [...contents].map(this.#itemToAction.bind(this)),
            nestGroupData
          )
        })
    }

    #buildSheetRollAction (key, actionTypeId, nameKey) {
      // @todo UFT translation keys
      const id = key
      const name = coreModule.api.Utils.i18n(nameKey)
      const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE[actionTypeId])
      const listName = `${actionTypeName ? `${actionTypeName}: ` : ''}${name}`
      const encodedValue = [actionTypeId, key].join(this.delimiter)

      return { id, name, listName, encodedValue }
    }

    #buildAbilityCheckList () {
      const actionKey = 'abilitycheck'
      const abilityKeys = ['str', 'int', 'wis', 'dex', 'con', 'cha']

      this.addActions(
        abilityKeys.map(abilityKey => this.#buildSheetRollAction(
          abilityKey,
          actionKey,
          `OSE.scores.${abilityKey}.long`
        )),
        this.groups.checks_abilitychecks
      )
    }

    #buildExplorationSkilleList () {
      const actionKey = 'exploration'
      const abilityKeys = ['ld', 'od', 'sd', 'ft']

      this.addActions(
        abilityKeys.map(abilityKey => this.#buildSheetRollAction(
          abilityKey,
          actionKey,
          `OSE.exploration.${abilityKey}.long`
        )),
        this.groups.abilities_exploration
      )
    }
    
    #buildSaveList () {
      const actionKey = 'save'
      const abilityKeys = ['death', 'wand', 'paralysis', 'breath', 'spell']

      this.addActions(
        abilityKeys.map(abilityKey => this.#buildSheetRollAction(
          abilityKey,
          actionKey,
          `OSE.saves.${abilityKey}.long`
        )),
        this.groups.checks_saves
      )
    }

    #buildAbilitiesList () {
      const hasRoll = (i) => (!!i.system.roll)
      const rollable = this.actor.system.abilities.filter(hasRoll)
      const misc = this.actor.system.abilities.filter(i => !hasRoll(i))
      const toMap = (map, item) => {
        map.set(item.id, item)
        return map
      }

      this.#assignActions(
        'rolledAbilities',
        rollable.reduce(toMap, new Map())
      )

      this.#assignActions(
        'miscAbilities',
        misc.reduce(toMap, new Map())
      )
    }

    #buildSpellsList () {
      const { spellList } = this.actor.system.spells
    
      for (const [level, spells] of Object.entries(spellList)) {
        const {used, max} = this.actor.system.spells.slots[level];

        // No slots memorized or available at this level? Bail.
        if (!used || !max) continue;
        
        const memorizedSpells = spells.reduce((map, spell) => {
          const { memorized, cast } = spell.system
          if (memorized && cast) {
            map.set(spell.id, spell)
          } 
          return map
        }, new Map())

        // No spells prepared for this level? Bail.
        // if (!memorizedSpells.size) continue
       
        const levelGroup = {
          id: `spells_${level}`,
          name: game.i18n.format('tokenActionHud.uft.spells.level', { level }),
          type: 'system',
          nestId: `spells`,
          settings: { style: 'tab' },
          info1:  `${used}/${max}`,
        }
      
        this.addGroup(levelGroup, this.groups.spells)

        this.addActions(
          [...memorizedSpells].map(this.#itemToAction.bind(this)),
          { id: levelGroup.id, nestId: levelGroup.nestId }
        )
      }
    }

    /**
     * Build multiple token actions
     * @private
     * @returns {object}
     */
    #buildMultipleTokenActions () {
    }

    /**
     * Build inventory
     * @private
     */
    // async #buildInventory () {
    //     if (this.items.size === 0) return

    //     const actionTypeId = 'item'
    //     const inventoryMap = new Map()

    //     for (const [itemId, itemData] of this.items) {
    //         const type = (itemData.type !== 'item')
    //             ? itemData.type
    //             : itemData.system.treasure
    //                 ? GROUP.treasure.id
    //                 : GROUP.items.id
    //         const equipped = itemData.system.equipped

    //         if (equipped || this.displayUnequipped) {
    //             // Special handling for treasure items
    //             const typeMap = inventoryMap.get(type) ?? new Map()
    //             typeMap.set(itemId, itemData)
    //             inventoryMap.set(type, typeMap)
    //         }
    //     }

    //     for (const [type, typeMap] of inventoryMap) {
    //         const groupId = ITEM_TYPE[type]?.groupId

    //         if (!groupId) continue

    //         const groupData = { id: groupId, type: 'system' }

    //         // Get actions
    //         const actions = [...typeMap].map(([itemId, itemData]) => {
    //             const id = itemId
    //             const name = itemData.name
    //             const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE[actionTypeId])
    //             const listName = `${actionTypeName ? `${actionTypeName}: ` : ''}${name}`
    //             const encodedValue = [actionTypeId, id].join(this.delimiter)

    //             return {
    //                 id,
    //                 name,
    //                 listName,
    //                 encodedValue
    //             }
    //         })

    //         // TAH Core method to add actions to the action list
    //         this.addActions(actions, groupData)
    //     }
    // }
  // }
  }
})
