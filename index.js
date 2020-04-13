const discord = require("discord.js")
const fs = require('fs')
const client = new discord.Client();
var difficulty = require('./difficulties/normal.json')
const config = require('./config.json')

var lastPlayer = ""
client.once('ready', () => {
    console.log('Ready !')
})

client.login(config.token)

client.on("message", message => {
    if(!message.content.startsWith("!")) return

    if(message.content.startsWith('!help')){
        message.reply("!dare pour une action;\n !truth pour une véritée;\n !difficulty [difficulty] pour changer la difficultée;\n !addquest [difficulty] [dare/truth] [gageName] [question] pour ajouter une question;\n %p cible l'auteur %rp personne aleatoire %lp dernier joueur %ri image aleatoire %rn(a,b) nombre aleatoire")
    } else if(message.content.startsWith("!difficulty")) {
        difficulty = require("./difficulties/"+message.content.split(' ')[1])
        message.reply("Set difficulty to " + message.content.split(" ")[1])
    } else if(message.content.startsWith("!truth") || message.content.startsWith("!dare")) {
        var type = message.content.replace("!", "")
        var keys = Object.keys(difficulty[type])
        const randIndex = Math.floor(Math.random() * keys.length)

        var randKey = keys[randIndex]
        //message.reply(difficulty[type][randKey].description)
        message.reply(formatGage(message, difficulty[type][randKey]))

        lastPlayer = message.author
    } else if(message.content.startsWith('!addquest')){
        var args = message.content.split(' ')
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
        
    } else if(message.content.startsWith('!test')) {
        message.reply(formatGage(message, "avec %rp"))
    }
})

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
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/*
%p = Le joueur
%rp = Personne aléatoire
%lp = Dernière personne
%ri
%rn
 */
