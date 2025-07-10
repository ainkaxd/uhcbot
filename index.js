const fs = require('fs');
const path = require('path');
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

const { readTeams, saveTeams } = require('./core/uhcStorage');
const { updateTeamListMessage } = require('./core/ui');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] Команда в файле ${file} не имеет 'data' или 'execute'.`);
  }
}

client.once('ready', () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Slash-команды
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      try {
        const errorMsg = { content: '❌ Произошла ошибка.', flags: 1 << 6 };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      } catch (innerError) {
        console.warn('⚠ Не удалось отправить сообщение об ошибке:', innerError.message);
      }
    }
  }

  // Кнопки
  if (interaction.isButton()) {
    if (interaction.customId === 'register') {
      try {
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
      } catch (e) {
        console.warn('❌ Ошибка показа модалки регистрации:', e.message);
      }
    } else if (interaction.customId === 'edit') {
      try {
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
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('teamname')
                .setLabel('Новое название команды')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
      } catch (e) {
        console.warn('❌ Ошибка показа модалки изменения состава:', e.message);
      }
    } else if (interaction.customId === 'unregister') {
      const userId = interaction.user.id;
      const teams = readTeams();
      const teamEntry = Object.entries(teams).find(([_, team]) =>
        team.leader === userId || team.teammate === userId
      );

      if (!teamEntry) {
        return interaction.reply({
          content: '❌ Ты не зарегистрирован ни в одной команде.',
          flags: 1 << 6
        });
      }

      const [teamId, team] = teamEntry;
      delete teams[teamId];
      saveTeams(teams);
      const channel = await interaction.guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);
      await updateTeamListMessage(channel);

      return interaction.reply({
        content: `✅ Ты покинул команду **${team.name}**.`,
        flags: 1 << 6
      });
    }
  }

  // Обработка модалок
  if (interaction.isModalSubmit()) {
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const teams = readTeams();

    if (interaction.customId === 'register-modal') {
      const teammateTag = interaction.fields.getTextInputValue('teammate');
      const teamName = interaction.fields.getTextInputValue('teamname');
      const teammate = members.find(u => u.user.tag === teammateTag);

      if (!teammate) {
        return interaction.reply({ content: '❌ Тиммейт не найден.', flags: 1 << 6 });
      }

      const alreadyInTeam = Object.values(teams).some(team =>
        team.leader === userId || team.teammate === userId ||
        team.leader === teammate.id || team.teammate === teammate.id
      );

      if (alreadyInTeam) {
        return interaction.reply({
          content: '❌ Кто-то из вас уже зарегистрирован.',
          flags: 1 << 6
        });
      }

      const teamId = `${userId}-${teammate.id}`;
      teams[teamId] = {
        name: teamName,
        leader: userId,
        teammate: teammate.id
      };

      saveTeams(teams);
      const channel = await guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);
      await updateTeamListMessage(channel);

      return interaction.reply({
        content: `✅ Команда **${teamName}** зарегистрирована: <@${userId}> + <@${teammate.id}>`,
        flags: 1 << 6
      });
    }

    if (interaction.customId === 'edit-modal') {
      const newTag = interaction.fields.getTextInputValue('teammate');
      const newName = interaction.fields.getTextInputValue('teamname');
      const newMate = members.find(u => u.user.tag === newTag);

      if (!newMate) {
        return interaction.reply({ content: '❌ Новый тиммейт не найден.', flags: 1 << 6 });
      }

      let teamId = null;
      let old = null;
      for (const [id, team] of Object.entries(teams)) {
        if (team.leader === userId || team.teammate === userId) {
          teamId = id;
          old = team;
          break;
        }
      }

      if (!teamId) {
        return interaction.reply({ content: '❌ Ты не в команде.', flags: 1 << 6 });
      }

      delete teams[teamId];
      teams[`${userId}-${newMate.id}`] = {
        name: newName,
        leader: userId,
        teammate: newMate.id
      };

      saveTeams(teams);
      const channel = await guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);
      await updateTeamListMessage(channel);

      return interaction.reply({ content: `✅ Состав изменён. Новая команда: **${newName}**`, flags: 1 << 6 });
    }
  }
});

client.login(process.env.TOKEN);