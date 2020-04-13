const discord = require("discord.js")
const fs = require('fs')
const Party = require('./utils/party.js')

const client = new discord.Client();
var difficulty = require('./difficulties/test.json')
const config = require('./config.json')

var partyList = {}
var playerList = {}
var lastPlayer = ""
client.once('ready', () => {
    console.log('Ready !')
})

client.login(config.token)

client.on("message", message => {
    if(!message.content.startsWith("!")) return

    var args = message.content.split(' ')
    if(message.content.startsWith('!help')){
        message.reply("!dare pour une action;\n !truth pour une véritée;\n !difficulty [difficulty] pour changer la difficultée;\n !addquest [difficulty] [dare/truth] [gageName] [question] pour ajouter une question;\n %p cible l'auteur %rp personne aleatoire %lp dernier joueur %ri image aleatoire %rn(a,b) nombre aleatoire")
    } else if(message.content.startsWith("!difficulty")) {
        difficulty = require("./difficulties/"+message.content.split(' ')[1])
        message.reply("Set difficulty to " + message.content.split(" ")[1])
    } else if(message.content.startsWith("!truth") || message.content.startsWith("!dare")) {
        if(playerList[message.author.id] == undefined)
            playerList[message.author.id] = {gageDone: []}

        var key = generateGage(message)
        var type = message.content.replace("!", "")
        var gage = difficulty[type][key]
        console.log(key)
        if(playerList[message.author.id].gageDone.join(',').includes(key)){
            if(gage.ifdone != null){
                if(!playerList[message.author.id].gageDone.join(',').includes(gage.ifdone))
                    playerList[message.author.id].gageDone.push(gage.ifdone)
                gage = difficulty.special[gage.ifdone]
            }
        } else {
            if(!playerList[message.author.id].gageDone.join(',').includes(key))
                playerList[message.author.id].gageDone.push(key)
        }

        console.log(playerList[message.author.id].gageDone)
        message.reply(formatGage(message, gage))

        lastPlayer = message.author
    } else if(message.content.startsWith('!addquest')){
        var dif = require('./difficulties/'+args[1])
        var description = ""
        for(i = 4; i < args.length; i++) {
            description += args[i] + " "
        }
        dif[args[2]][args[3]] = {"description": description + " "}

        fs.writeFile('./difficulties/'+args[1]+".json", JSON.stringify(dif), function(err) {
            if(err)
                console.log(err)
        })
    } else if(message.content.startsWith("!info")){
        generateInfo(message, difficulty)
    } else if(message.content.startsWith('!createparty')) {
        if(partyList[args[1]] != null) {
            message.reply("Cette party existe déja")
            return
        }
        partyList[args[1]] = new Party(args[1], args[2])
        partyList[args[1]].memberList.push(message.author.id)
        playerList[message.author.id] = {party: args[1]}
        message.reply("La party " + args[1] + " a bien été crée en difficulté " + args[2])
    } else if(message.content.startsWith("!joinparty")) {
        var party = partyList[args[1]]
        if(party == undefined){
            message.reply("Cette party n'existe pas")
            return
        }
        if(party.locked == false && playerList[message.author.id].party == null) {
            partyList[args[1]].memberList.push(message.author.id)
            message.reply("Vous avez rejoins la party !")
        } else
            message.reply("Cette party est fermée ou vous etes deja dans une party faites !leave")
    } else if(message.content.startsWith("!leave")) {
        if(playerList[message.author.id] == undefined || playerList[message.author.id].party == null) {
            message.reply("Erreur, vous n'êtes pas dans une party")
            return
        }
        if(playerList[message.author.id].party != null) {
            var party = partyList[playerList[message.author.id].party]
            var index =party.memberList.indexOf(message.author.id)

            if(index > -1 )
                partyList[playerList[message.author.id].party].memberList.slice(index, 1)
            if(partyList[playerList[message.author.id].party].memberList.length == 0) {
                partyList[playerlist[message.author.id].party] = null
            }
            playerList[message.author.id].party = null

            message.reply("Vous avez quitté la party, c'est triste :sob:")
        }
    }
})

function generateGage(message){
    if(playerList[message.author.id] != undefined && playerList[message.author.id].party != null)
        difficulty = require('./difficulties/'+partyList[playerList[message.author.id].party].difficulty)

    var type = message.content.replace("!", "")
    var keys = Object.keys(difficulty[type])
    const randIndex = Math.floor(Math.random() * keys.length)

    var randKey = keys[randIndex]
    return randKey
}

function formatGage(message, gage) {
    var description = gage.description

    if(description.includes("%p"))
        description = description.replace("%p", message.author.username)

    if(description.includes("%lp"))
        description = description.replace("%lp", lastPlayer.username)

    if(description.includes("%rn"))
        description = description.replace("%rn", randomIntFromInterval(gage.randomint[0], gage.randomint[1]))
    if(description.includes("%ri"))
        description = description.replace("%ri", Array.from(difficulty.images))

    if(description.includes("%rp")) {
        description = description.replace("%rp","^^^")
        var listUsers = []
        var randomPerson = message.guild.members.fetch().then(fetchedMembers => {
            var online = fetchedMembers.filter(member => member.presence.status === 'online');
            online.forEach(e => {
                if(e.user.bot == false && e.user != message.author)
                    listUsers.push(e.user.username)
            })
            message.reply(Array.from(listUsers))
        })
        console.log(description)
    }
    return description

}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function generateInfo(message, difficulty) {
    var interrupt = false
    var args = message.content.split(' ')
    var embed = new discord.MessageEmbed()
        .setColor("#00ffff")
        .setTitle("Info sur la difficultée en cours")
        .addFields({name: 'Nombre de véritées', value: Object.keys(difficulty.truth).length, inline: true})
        .addFields({name: 'Nombre de gages', value: Object.keys(difficulty.dare).length, inline: true})
    if(message.content.includes('-t')) {
        var count = 0;
        var response = "--{Liste des véritées}--\n"
        Object.keys(difficulty.truth).forEach(e => {
            count += 1
            response += e + " : " + difficulty.truth[e].description + "\n"

            if(count == 10) {
                message.channel.send(response)
                count =0
                response = ""
            }
        })
        message.channel.send(response)
    }
    if(message.content.includes('-d')) {
        var count = 0;
        var response = "--{Liste des Actions}--\n"
        Object.keys(difficulty.dare).forEach(e => {
            count += 1
            response += e + " : " + difficulty.dare[e].description + "\n"

            if(count == 10) {
                message.channel.send(response)
                count =0
                response = ""
            }
        })
        message.channel.send(response)
    }

    if(message.content.includes('-ld')) {
        interrupt = true
        var listDifficulties = []
        fs.readdir("./difficulties/", (err, files) => {
            if(err) console.log(err);

            let jsfile = files.filter(f => f.split(".").pop() === "json" && !f.startsWith("!"))
            if (jsfile.length <= 0) {
                console.log("Couldn't find commands");
                return;
            }

            jsfile.forEach((f,i) => {
                console.log(`${f} loaded !`);
                listDifficulties.push(f.replace('.json',''))
            });
            embed.addFields({name: 'Liste des difficultés', value: listDifficulties.join(', ')})
            message.channel.send(embed)
            return
        })
    }
    if(interrupt == false)
        message.channel.send(embed)
}

// check if an element exists in array using a comparer function
// comparer : function(currentElement)
Array.prototype.inArray = function(comparer) { 
    for(var i=0; i < this.length; i++) { 
        if(comparer(this[i])) return true; 
    }
    return false; 
}; 

// adds an element to the array if it does not already exist using a comparer 
// function
Array.prototype.pushIfNotExist = function(element, comparer) { 
    if (!this.inArray(comparer)) {
        this.push(element);
    }
}; 
/*
%p = Le joueur
%rp = Personne aléatoire
%lp = Dernière personne
%ri
%rn
 */
