const { SlashCommandBuilder } = require('discord.js');
const { updateTeamListMessage } = require('../core/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhclist')
    .setDescription('Обновляет embed со списком команд вручную'),

  async execute(interaction) {
    const channel = await interaction.guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);
    await updateTeamListMessage(channel);
    return interaction.reply({ content: '✅ Список обновлён.', ephemeral: true });
  }
};
