require('dotenv').config();
const {
  Client,
  Collection,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();
client.teams = new Map(); // вместо файловой системы
client.registrationMessage = null;

client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      const errorMsg = { content: '❌ Произошла ошибка.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  }

  if (interaction.isButton()) {
    const userId = interaction.user.id;
    if (interaction.customId === 'register') {
      const modal = new ModalBuilder()
        .setCustomId('register-modal')
        .setTitle('Регистрация команды')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teammate')
              .setLabel('Discord тег тиммейта (пример: user#0001)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teamname')
              .setLabel('Название команды')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'edit') {
      if (!client.teams.has(userId)) {
        return interaction.reply({ content: '❌ Ты не в команде.', ephemeral: true });
      }

      const old = client.teams.get(userId);

      const modal = new ModalBuilder()
        .setCustomId('edit-modal')
        .setTitle('Изменение состава команды')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teammate')
              .setLabel('Новый Discord тег тиммейта')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(old.teammateTag || '')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teamname')
              .setLabel('Новое название команды')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(old.name || '')
          )
        );
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'unregister') {
      if (!client.teams.has(userId)) {
        return interaction.reply({ content: '❌ Ты не зарегистрирован.', ephemeral: true });
      }
      client.teams.delete(userId);
      await updateTeamListMessage(interaction.guild, client);
      return interaction.reply({ content: '✅ Ты вышел из команды.', ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const members = await guild.members.fetch();

    if (interaction.customId === 'register-modal') {
      const teammateTag = interaction.fields.getTextInputValue('teammate');
      const teamName = interaction.fields.getTextInputValue('teamname');
      const teammate = members.find(u => u.user.tag === teammateTag);

      if (!teammate) {
        return interaction.reply({ content: '❌ Тиммейт не найден.', ephemeral: true });
      }

      const alreadyInTeam = [...client.teams.values()].some(team =>
        team.leader === userId || team.teammate === userId ||
        team.leader === teammate.id || team.teammate === teammate.id
      );

      if (alreadyInTeam) {
        return interaction.reply({ content: '❌ Кто-то из вас уже зарегистрирован.', ephemeral: true });
      }

      client.teams.set(userId, {
        name: teamName,
        leader: userId,
        teammate: teammate.id,
        teammateTag: teammateTag
      });

      await updateTeamListMessage(guild, client);
      return interaction.reply({ content: `✅ Команда **${teamName}** зарегистрирована!`, ephemeral: true });
    }

    if (interaction.customId === 'edit-modal') {
      const newTag = interaction.fields.getTextInputValue('teammate');
      const newName = interaction.fields.getTextInputValue('teamname');
      const newMate = members.find(u => u.user.tag === newTag);

      if (!newMate) {
        return interaction.reply({ content: '❌ Новый тиммейт не найден.', ephemeral: true });
      }

      client.teams.set(userId, {
        name: newName,
        leader: userId,
        teammate: newMate.id,
        teammateTag: newTag
      });

      await updateTeamListMessage(guild, client);
      return interaction.reply({ content: `✅ Команда обновлена на **${newName}**!`, ephemeral: true });
    }
  }
});

async function updateTeamListMessage(guild, client) {
  const channel = await guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);
  if (!channel || !client.registrationMessage) return;

  let description = '';
  let index = 1;
  for (const [id, team] of client.teams.entries()) {
    description += `**${index}.** <@${team.leader}> + <@${team.teammate}> — **${team.name}**\n`;
    index++;
  }
  if (!description) description = 'Пока никто не зарегистрировался.';

  const embed = new EmbedBuilder()
    .setTitle('📋 Список команд')
    .setDescription(description)
    .setColor(0x00ae86);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('register').setLabel('Регистрация').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('edit').setLabel('Изменить состав').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('unregister').setLabel('Отменить участие').setStyle(ButtonStyle.Danger)
  );

  await client.registrationMessage.edit({ embeds: [embed], components: [row] });
}

client.login(process.env.TOKEN);