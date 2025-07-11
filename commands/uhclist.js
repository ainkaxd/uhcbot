const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhclist')
    .setDescription('Создаёт сообщение со списком участников (обновляется автоматически)'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Unemployed jigaz')
      .setDescription('_пока никто не зарегистрировался_')
      .setColor(0x00ae86);

    const sent = await interaction.channel.send({ embeds: [embed] });

    client.teamListMessage = sent; // сохраняем это сообщение
    await interaction.reply({ content: '✅ Сообщение со списком создано.', ephemeral: true });
  }
};
