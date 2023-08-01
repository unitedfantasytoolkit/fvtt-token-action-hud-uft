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
      this.actorType = this.actor?.type

      /**
       * @todo Handle monsters
       */
      if (this.actorType === 'character') {
        this.#buildCharacterActions()
      } else if (this.actorType === 'monster') {
        this.#buildMonsterActions()
      } else if (!this.actor) {
        this.#buildMultipleTokenActions()
      }
    }

    get actors() {
      if (this.actor) {
        return [this.actor]
      }
      return coreModule.api.Utils.getControlledTokens()
        .map(token => token.document.actor)
    }

    get actorsAreSameType() {
      if (this.actor) return true
      
      const compareType = this.actors[0].type
      return this.actors.every(a => a.type === compareType)
    }

    /**
     * Build multiple token actions
     * @private
     * @returns {object}
     */
    #buildMultipleTokenActions () {
      this.removeGroup({ id: "inventory" })
      this.removeGroup({ id: "abilities" })
      this.removeGroup({ id: "spells" })
      if (this.actorsAreSameType) {
        if (this.actors[0].type === 'character') {
          this.#buildMultiCharacterActions()
        } else if (this.actors[0].type === 'monster') {
          this.#buildMultiMonsterActions()
        }
      } else {
        this.#buildMixedActorActions()
      }      
    }
    
    /**
     * Build character actions
     * @private
     */
    #buildCharacterActions () {
      this.#buildItemList()
      this.#buildAbilityCheckList()
      this.#buildExplorationSkilleList () 
      this.#buildSaveList()
      this.#buildAbilitiesList()
      this.#buildSpellsList()
      this.#buildCombatUtilityActions()
      this.#buildMoraleActions()
      this.#buildHPActions()

      this.updateGroup({ id: "abilities", settings: { style: 'tab' }})
    }

    /**
     * Build monster actions
     * @todo - Do attack routines
     * @todo - Do reset attack routines
     * @todo - If inventory is enabled, list consumables
     */
    #buildMonsterActions() {
      this.#buildSaveList()
      this.removeGroup({ id: "inventory" })
      this.#buildSpellsList()
      this.#buildCombatUtilityActions()
      this.#buildMoraleActions()
      this.#buildHPActions()
    }

    /**
     * Build actions for multiple characters
     */
    #buildMultiCharacterActions() {
      this.#buildExplorationSkilleList () 
      this.#buildAbilityCheckList()
      this.#buildSaveList()
      this.#buildCombatUtilityActions()
      this.#buildMoraleActions()
      this.#buildHPActions()

      this.removeGroup({ id: "inventory" })
      this.removeGroup({ id: "abilities" })
      this.removeGroup({ id: "spells" })
    }

    /**
     * Build actions for multiple monsters
     * @todo - Should we handle "multiple of same monster" vs. "multiple different monster types"?
     */
    #buildMultiMonsterActions() {
      this.#buildSaveList()
      this.#buildHPActions()
      this.#buildMoraleActions()
      this.removeGroup({ id: "inventory" })
      this.removeGroup({ id: "abilities" })
      this.removeGroup({ id: "spells" })
    }

    /**
     * Build actions for monsters *and* characters
     */
    #buildMixedActorActions() {
      this.#buildSaveList()
      this.#buildMoraleActions()
      this.#buildHPActions()
      this.removeGroup({ id: "inventory" })
      this.removeGroup({ id: "abilities" })
      this.removeGroup({ id: "spells" })
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

      const weaponMap = this.actor.system.weapons.reduce(toMap, new Map()) 
      const armorMap = this.actor.system.armor.reduce(toMap, new Map())
      const consumableMap = [...this.actor.system.items, ...this.actor.system.treasures]
        .filter(i => !!i.system.quantity.max && !!i.system.quantity.value)
        .reduce(toMap, new Map())
  
      if (!weaponMap.size && !armorMap.size && !consumableMap.size) {
        this.removeGroup({ id: "inventory" })
      }
      
      if (weaponMap.size) {
        this.addGroup(
          {...GROUP.weapons, nestId: 'inventory_weapons'},
          this.groups.inventory
        )
        this.#assignActions('weapons', weaponMap)
      }
      if (armorMap.size) {
        this.addGroup(
          {...GROUP.armor, nestId: 'inventory_armor'},
          this.groups.inventory
        )
        this.#assignActions('armor', armorMap)
      }
      if (consumableMap.size) {
        this.addGroup(
          {...GROUP.items, nestId: 'inventory_items'},
          this.groups.inventory
        )
        this.#assignActions('items', consumableMap)
      }
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

      this.addGroup(
        {...GROUP.abilitychecks, nestId: 'checks_abilitychecks'},
        this.groups.checks
      )

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

      this.addGroup(
        {...GROUP.explorationSkills, nestId: 'abilities_exploration'},
        this.groups.abilities
      )
      
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

      this.addGroup(
        {...GROUP.saves, nestId: 'checks_saves', order: 1},
        this.groups.checks
      )
      
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

      if (rollable.length) {
        this.addGroup(
          {...GROUP.rolledAbilities, nestId: 'abilities_rollable'},
          this.groups.abilities
        )
        this.#assignActions(
          'rolledAbilities',
          rollable.reduce(toMap, new Map())
        )
      }

      if (misc.length) {
        this.addGroup(
          {...GROUP.miscAbilities, nestId: 'abilities_misc'},
          this.groups.abilities
        )
        this.#assignActions(
          'miscAbilities',
          misc.reduce(toMap, new Map())
        )
      }

    }

    /**
     * @todo Only add the spells group if spells exist and this actor can use spells
     */
    #buildSpellsList () {
      if (!this.actor.system.spells.enabled) {
        this.removeGroup({id: "spells"})
        return
      }
      
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
     * @todo "Melee attack"
     * @todo "Missile attack"
     * @todo If equipped weapon, "Attack with equipped weapon"
     */
    #buildCombatUtilityActions() {
      const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE["combat"])
      const meleeName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.melee")
      const missileName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.missile")
      const equippedName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.withEquipped")

      const meleeInfo = this.actor
        ? { text: `${this.actor.system.meleeMod > 0 ? `+${this.actor.system.meleeMod}` : this.actor.system.meleeMod}, 1d6` }
        : null

      const missileInfo = this.actor
        ? { text: `${this.actor.system.rangedMod > 0 ? `+${this.actor.system.rangedMod}` : this.actor.system.rangedMod}, 1d6` }
        : null

      const hasCharacter = this.actors.map(a => a.type).includes('character')
      const canDoEquippedAttacks = this.actors.some(a => {
        return a.system.weapons.some(i => i.system.equipped)
      })

      const meleeAction = {
        id: "melee",
        name: meleeName,
        listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${meleeName}`,
        encodedValue: ["combat", "melee"].join(this.delimiter),
        info1: meleeInfo
      }
      const missileAction = {
        id: "missile",
        name: missileName,
        listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${missileName}`,
        encodedValue: ["combat", "missile"].join(this.delimiter),
        info1: missileInfo
      }
      const attackWithEquippedAction = (hasCharacter && canDoEquippedAttacks)
        ? {
          id: "equipped",
          name: equippedName,
          listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${equippedName}`,
          encodedValue: ["combat", "equipped"].join(this.delimiter),
        } : null
      const actions = [meleeAction, missileAction, attackWithEquippedAction].filter(i => !!i?.listName)
      this.addActions(actions, this.groups.utility_combat)
    }

    #buildMoraleActions() {
      const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE["morale"])
      
      const moraleName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.morale")
      const loyaltyName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.loyalty")
      const moraleAction = 
        (
          game.settings.get(game.system.id, 'morale') &&
          this.actors.map(a => a.type).includes('monster')
        ) ? {
          id: "morale",
          name: moraleName,
          listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${moraleName}`,
          encodedValue: ["morale", "morale"].join(this.delimiter),
        } : null
      const loyaltyAction = (
          this.actors.map(a => a.type).includes('character') &&
          this.actors.some(a => a.system.retainer.enabled)
        ) ? {
          id: "loyalty",
          name: loyaltyName,
          listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${loyaltyName}`,
          encodedValue: ["morale", "loyalty"].join(this.delimiter),
        } : null
      const actions = [moraleAction, loyaltyAction].filter(i => !!i?.listName)
      this.addActions(actions, this.groups.utility_utility)
    }
    
    #buildHPActions() {
      const actionTypeName = coreModule.api.Utils.i18n(ACTION_TYPE["hp"])
      
      const hpName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.hp")
      const hdName = coreModule.api.Utils.i18n("tokenActionHud.uft.utility.hd")
      const hpAction = (this.actors.map(a => a.type).includes('monster'))
        ? {
          id: "hp",
          name: hpName,
          listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${hpName}`,
          encodedValue: ["hp", "hp"].join(this.delimiter),
        } : null
      const hdAction = (this.actors.map(a => a.type).includes('character'))
        ? {
          id: "hd",
          name: hdName,
          listName: `${actionTypeName ? `${actionTypeName}: ` : ''}${hdName}`,
          encodedValue: ["hp", "hd"].join(this.delimiter),
        } : null
      const actions = [hpAction, hdAction].filter(i => !!i?.listName)
      this.addActions(actions, this.groups.utility_utility)
    }

  }
})
