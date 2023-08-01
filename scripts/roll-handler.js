export let RollHandler = null

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
  /**
   * Extends Token Action HUD Core's RollHandler class and handles action events triggered when an action is clicked
   */
  RollHandler = class RollHandler extends coreModule.api.RollHandler {
    /**
     * Handle action event
     * Called by Token Action HUD Core when an action event is triggered
     * @override
     * @param {object} event    The event
     * @param {string} encodedValue The encoded value
     */
    async doHandleActionEvent (event, encodedValue) {
      const payload = encodedValue.split('|')

      if (payload.length !== 2) {
        super.throwInvalidValueErr()
      }

      const actionTypeId = payload[0]
      const actionId = payload[1]

      const renderable = ['item']

      if (renderable.includes(actionTypeId) && this.isRenderItem()) {
        return this.doRenderItem(this.actor, actionId)
      }

      const knownCharacters = ['character', 'monster']

      // If single actor is selected
      if (this.actor) {
        await this.#handleAction(event, this.actor, this.token, actionTypeId, actionId)
        return
      }

      const controlledTokens = canvas.tokens.controlled
        .filter((token) => knownCharacters.includes(token.actor?.type))

      // If multiple actors are selected
      for (const token of controlledTokens) {
        const actor = token.actor
        await this.#handleAction(event, actor, token, actionTypeId, actionId)
      }
    }

    /**
     * Handle action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {object} token    The token
     * @param {string} actionTypeId The action type id
     * @param {string} actionId   The actionId
     */
    async #handleAction (event, actor, token, actionTypeId, actionId) {
      switch (actionTypeId) {
      case 'item':
        this.#handleItemAction(event, actor, actionId)
        break
      case 'exploration':
        actor.rollExploration(actionId, {fastForward: !this.actor})
        break
      case 'abilitycheck':
        actor.rollCheck(actionId, {fastForward: !this.actor})
        break
      case 'save':
        actor.rollSave(actionId, {fastForward: !this.actor})
        break
      case 'utility':
        this.#handleUtilityAction(token, actionId)
        break
      case 'combat':
        this.#handleWeaponlessAttackAction(actor, actionId)
        break
      case 'morale':
        if (actionId === 'loyalty' && actor.type === 'character' && actor.system.retainer.enabled) {
          this.#handleLoyalty(actor)
        }
        if (actionId === 'morale' && actor.type === 'monster') {
          this.#handleMorale(actor)
        }
        break
      case 'hp':
        switch (actionId) {
        case 'hp':
          if (actor.type === 'monster') {
            const d = Dialog.confirm({
              title: game.i18n.localize("tokenActionHud.uft.utility.hp"),
              content: `<p>${game.i18n.localize("tokenActionHud.uft.utility.hpConfirm")}</p>`,
              yes: async () => {
                await actor.rollHP()
                const speaker = ChatMessage.getSpeaker({ actor });
                ChatMessage.create({
                  content: `<p>${game.i18n.localize("tokenActionHud.uft.utility.hpRolled")}</p>`,
                  blind: true,
                  speaker,
                });
              }
            })
          }
          break
        case 'hd':
          if (actor.type === 'character') {
            actor.rollHitDice()
          }
          break
        }
        break
      }
    }

    #handleWeaponlessAttackAction(actor, type) {
      if (type === 'equipped') {
        actor.system.weapons
          .filter(i => i.system.equipped)
          .forEach(i => {
            i.roll({skipDialog: true})
          })
      } else {
        actor.targetAttack({roll: {}}, type, { skipDialog: false })
      }
    }

    async #handleLoyalty(actor) {
      this.#handleScary(actor, 'rollLoyalty')
    }

    async #handleMorale(actor) {
      this.#handleScary(actor, 'rollMorale')
    }

    async #handleScary(actor, rollFnName) {
      const rollOptions = { fastForward: true}
      const roll = await actor[rollFnName](rollOptions)      
      if (!actor.token.hasStatusEffect('fear') && roll.total > roll.data.roll.target) {
        actor?.token.toggleActiveEffect(CONFIG.statusEffects.find(e => e.id === 'fear'))
      }
    }

    /**
     * Handle item action
     * @private
     * @param {object} event  The event
     * @param {object} actor  The actor
     * @param {string} actionId The action id
     */
    #handleItemAction (event, actor, actionId) {
      const item = actor.items.get(actionId)
      if (item.type === "armor") {
        item.update({ "system.equipped": !item.system.equipped })
      } else if (item.type === "item") {
        if (item.system.quantity.value) {
          item.update({
            "system.quantity.value":  item.system.quantity.value - 1
          })
        }
        item.roll()
      } else {
        item.roll()
      }
    }

    /**
     * Handle utility action
     * @private
     * @param {object} token  The token
     * @param {string} actionId The action id
     */
    async #handleUtilityAction (token, actionId) {
      switch (actionId) {
      case 'endTurn':
        if (game.combat?.current?.tokenId === token.id) {
          await game.combat?.nextTurn()
        }
        break
      }
    }
  }
})
