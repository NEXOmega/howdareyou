// My module
function Party(name, difficulty) {
    this.name = name
    this.difficulty = difficulty
    this.locked = false
    this.memberList = []
}

Party.prototype.foo = function foo() {
  console.log(this.bar);
};

module.exports = Party;
