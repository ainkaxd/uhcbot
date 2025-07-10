const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhcinfo')
    .setDescription('Показывает информацию о турнире Pako UHC'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [
        {
          title: '🧨 Pako UHC 2 — снова тут джиги!',
          description: '> *12 июля в 21:00*\n> *1.8.9*\n> *микрофон 18+*',
          color: 0xffcc66,
          timestamp: new Date().toISOString(),
          footer: { text: 'Информация может обновляться' }
        }
      ]
    });
  }
};
