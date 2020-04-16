const discord = require("discord.js")
const fs = require('fs')
const axios = require('axios')
const Party = require('./utils/party.js')

const client = new discord.Client();
var difficulties = {}
var difficulty = require('./difficulties/custom.json')
const config = require('./config.json')
var regex = /(?<=\[)(.*?)(?=\])/

var partyList = {}
var playerList = {}
var lastPlayer = ""
client.once('ready', () => {
    console.log('Ready !')
    fs.readdir("./difficulties/", (err, files) => {
        if(err) console.log(err);

        let jsfile = files.filter(f => f.split(".").pop() === "json" && !f.startsWith("!"))
        if (jsfile.length <= 0) {
            console.log("Couldn't find commands");
            return;
        }

        jsfile.forEach((f,i) => {
            console.log(`${f} loaded !`);
            var diff = require('./difficulties/'+f)
            if(diff.options != undefined && diff.options.inherit != undefined) {
                Object.keys(diff.options.inherit).forEach(e => {
                    diff.options.inherit[e].forEach(l => {
                        diff[e] = Object.assign(diff[e], require("./difficulties/"+l+".json")[e])
                    })
                })
            }
            difficulties[f.replace(".json","")] = diff
        });
    })
})

client.login(config.token)

client.on("message", message => {
    if(!message.content.startsWith("!")) return

    var args = message.content.split(' ')
    if(message.content.startsWith("!test")) {
        console.log(difficulties)
    }
    if(message.content.startsWith('!help')){
        message.reply("!dare pour une action;\n !truth pour une véritée;\n !difficulty [difficulty] pour changer la difficultée;\n !addquest [difficulty] [dare/truth] [gageName] [question] pour ajouter une question;\n!pcreate [partyname][difficulty] Créer une party;\n!pjoin [party] Rejoindre une party;\n!pleave Quitter la party;\n %p cible l'auteur %rp personne aleatoire %lp dernier joueur %ri[difficulte] image aleatoire %rn[min, max] nombre aleatoire")
    } else if(message.content.startsWith("!difficulty")) {
        if(!fs.existsSync("./difficulties/"+args[1]+".json")){
            message.reply('La difficulté n\'existe pas faites !info')
            return
        }
        difficulty = difficulties[args[1]]
        message.reply("Set difficulty to " + message.content.split(" ")[1])
    } else if(message.content.startsWith("!truth") || message.content.startsWith("!dare")) {
        if(playerList[message.author.id] == undefined)
            playerList[message.author.id] = {gageDone: []}
        else
            playerList[message.author.id].gageDone = []

        var key = generateGage(message)
        var type = message.content.replace("!", "")
        var gage = difficulty[type][key]
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
        message.reply(formatGage(message, gage))

        lastPlayer = message.author
    } else if(message.content.startsWith('!addquest')){
        var dif = require('./difficulties/'+args[1])
        var description = ""
        for(i = 4; i < args.length; i++) {
            description += args[i] + " "
        }
        dif[args[2]][args[3]] = {"description": description + " "}

        fs.writeFile('./difficulties/'+args[1]+".json", JSON.stringify(dif, null, 2), function(err) {
            if(err)
                console.log(err)
        })
    } else if(message.content.startsWith("!info")){
        generateInfo(message, difficulty)
    } else if(message.content.startsWith('!pcreate')) {
        if(args.length < 3){
            message.reply('Erreur pas assez d\'arguments faites !pcreate [partyname] [dificulty]')
            return;
        }
        if(playerList[message.author.id] != undefined && playerList[message.author.id].party != null) {
            message.reply("Erreur, vous êtes déja dans une party faites !pleave")
            return
        }
        if(partyList[args[1]] != null) {
            message.reply("Cette party existe déja")
            return
        }
        if(!fs.existsSync("./difficulties/"+args[2]+".json")){
            message.reply('La difficulté n\'existe pas faites !info')
            return
        }
        partyList[args[1]] = new Party(args[1], args[2])
        partyList[args[1]].memberList.push(message.author.id)
        if(playerList[message.author.id] == undefined)
            playerList[message.author.id] = {party: args[1]}
        else
            playerList[message.author.id].party = args[1]
        message.reply("La party " + args[1] + " a bien été crée en difficulté " + args[2])
    } else if(message.content.startsWith("!pjoin")) {
        if(args.length <2){
            message.reply('Erreur, pas assez d\'arguments faites !pjoin [party]')
            return
        }
        if(playerList[message.author.id] != undefined && playerList[message.author.id].party != null) {
            message.reply("Erreur, vous êtes déja dans une party faites !pleave")
            return
        }
        var party = partyList[args[1]]
        if(party == undefined){
            message.reply("Cette party n'existe pas")
            return
        }
        if(party.locked == false) {
            partyList[args[1]].memberList.push(message.author.id)
            if(playerList[message.author.id] == undefined)
                playerList[message.author.id] = {party: args[1]}
            else
                playerList[message.author.id].party = args[1]
            message.reply("Vous avez rejoins la party !")
        } else
            message.reply("Cette party est fermée")
    } else if(message.content.startsWith("!pleave")) {
        if(playerList[message.author.id] == undefined || playerList[message.author.id].party == null) {
            message.reply("Erreur, vous n'êtes pas dans une party")
            return
        }
        if(playerList[message.author.id].party != null) {
            var party = partyList[playerList[message.author.id].party]

            partyList[playerList[message.author.id].party].memberList.remove(message.author.id)
            if(partyList[playerList[message.author.id].party].memberList.length == 0) {
                partyList[playerList[message.author.id].party] = null
                message.reply('La partie a été dissoute')
            }
            playerList[message.author.id].party = null

            message.reply("Vous avez quitté la party, c'est triste :sob:")
        }
    } else if(message.content.startsWith('!pedit')) {
        if(playerList[message.author.id] == undefined || playerList[message.author.id].party == null) {
            message.reply("Erreur, vous n'êtes pas dans une party")
            return
        }
        if(!fs.existsSync("./difficulties/"+args[1]+".json")){
            message.reply('La difficulté n\'existe pas faites !info')
            return
        }
        partyList[playerList[message.author.id].party].difficulty = args[1]
        message.reply("Set difficulty to " + args[1])
    } else if(message.content.startsWith('!plist')) {
        if(playerList[message.author.id] == undefined || playerList[message.author.id].party == null) {
            message.reply("Erreur, vous n'êtes pas dans une party")
            return
        }
        message.reply(partyList[playerList[message.author.id].party].memberList)
    }
})

function generateGage(message){
    if(playerList[message.author.id] != undefined && playerList[message.author.id].party != null)
        difficulty = difficulties[partyList[playerList[message.author.id].party].difficulty]

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

    if(description.includes("%rn")){
        var regexrn = /(?<=%rn\[)(.*?)(?=\])/
        var interval = regexrn.exec(description)[0].split(',')
        description = description.replace(`%rn[${regex.exec(description)[0]}]`, randomIntFromInterval(interval[0], interval[1]))
    }
    if(description.includes("%ri")){
        var regexri = /(?<=%ri\[)(.*?)(?=\])/
        description = description.replace(`%ri[${regexri.exec(description)[0]}]`, difficulties[regexri.exec(description)[0]].images[Math.floor(Math.random() * difficulty.images.length)])
    }
    if(description.includes("%rp")) {
        description = description.replace("%rp","^^^")
        if(playerList[message.author.id] == undefined || playerList[message.author.id].party == null) {
            console.log("noparty")
            var listUsers = []
            var randomPerson = message.guild.members.fetch().then(fetchedMembers => {
                var online = fetchedMembers
                online.forEach(e => {
                    if(e.user.bot == false && e.user != message.author)
                        listUsers.push(e.user.username)
                })
                message.reply(listUsers[Math.floor(Math.random() * listUsers.length)])
            })
        } else {
            var members = partyList[playerList[message.author.id].party].memberList
            message.reply(members[Math.floor(Math.random() * members.length)])
        }
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
        .addFields({name: 'Nombre de spécials', value: Object.keys(difficulty.special).length, inline: true})
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
    if(message.content.includes('-s')) {
        var count = 0;
        var response = "--{Liste des Spécials}--\n"
        Object.keys(difficulty.special).forEach(e => {
            count += 1
            response += e + " : " + difficulty.special[e].description + "\n"

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

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};
/*
%p = Le joueur
%rp = Personne aléatoire
%lp = Dernière personne
%ri[difficulty]
%rn[min, max]
 */
