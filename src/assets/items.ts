

export const uniqueItems = [{
    id: 0,
    kind: "item.unique",
    key: "The Gnasher",
    base_code: "hax",
    name: "The Gnasher",
    level: 7,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 8,
        max: 8
    }, {
        key: "openwounds",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "crush",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 4,
        min: 40,
        max: 50
    }, {
        key: "deep-wounds",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invhaxu",
        invtransform: ""
    },
    base: "Hand Axe"
}, {
    id: 1,
    kind: "item.unique",
    key: "Deathspade",
    base_code: "axe",
    name: "Deathspade",
    level: 12,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg-min",
        param_id: 2,
        min: 8,
        max: 8
    }, {
        key: "att%",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 4,
        max: 4
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 70
    }, {
        key: "deadly",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invaxeu",
        invtransform: ""
    },
    base: "Axe"
}, {
    id: 2,
    kind: "item.unique",
    key: "Bladebone",
    base_code: "2ax",
    name: "Bladebone",
    level: 20,
    modifiers: [{
        key: "dmg-undead",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "att-undead",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "ac",
        param_id: 4,
        min: 20,
        max: 60
    }, {
        key: "hit-skill",
        param_id: 5,
        min: 40,
        max: 8
    }, {
        key: "dmg%",
        param_id: 6,
        min: 30,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "inv2ax",
        invtransform: "lgry"
    },
    base: "Double Axe"
}, {
    id: 3,
    kind: "item.unique",
    key: "Mindrend",
    base_code: "mpi",
    name: "Skull Splitter",
    level: 28,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ltng-min",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 4,
        min: 60,
        max: 60
    }, {
        key: "att",
        param_id: 5,
        min: 50,
        max: 100
    }, {
        key: "dmg%",
        param_id: 6,
        min: 60,
        max: 80
    }, {
        key: "openwounds",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "Deep-Wounds",
        param_id: 8,
        min: 12,
        max: 16
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 21
    },
    image: {
        invfile: "invmpiu",
        invtransform: ""
    },
    base: "Military Pick"
}, {
    id: 4,
    kind: "item.unique",
    key: "Rakescar",
    base_code: "wax",
    name: "Rakescar",
    level: 36,
    modifiers: [{
        key: "pois-min",
        param_id: 1,
        min: 194,
        max: 194
    }, {
        key: "pois-max",
        param_id: 2,
        min: 194,
        max: 194
    }, {
        key: "pois-len",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 50,
        max: 100
    }, {
        key: "res-pois",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "dmg%",
        param_id: 6,
        min: 75,
        max: 150
    }, {
        key: "swing2",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invwax",
        invtransform: "dgry"
    },
    base: "War Axe"
}, {
    id: 5,
    kind: "item.unique",
    key: "Fechmars Axe",
    base_code: "lax",
    name: "Axe of Fechmar",
    level: 11,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 70,
        max: 90
    }, {
        key: "freeze",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "res-cold",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "light",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invlax",
        invtransform: "lpur"
    },
    base: "Large Axe"
}, {
    id: 6,
    kind: "item.unique",
    key: "Goreshovel",
    base_code: "bax",
    name: "Goreshovel",
    level: 19,
    modifiers: [{
        key: "swing3",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "openwounds",
        param_id: 3,
        min: 60,
        max: 60
    }, {
        key: "dmg%",
        param_id: 4,
        min: 30,
        max: 50
    }, {
        key: "dmg-max",
        param_id: 5,
        min: 9,
        max: 9
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 8,
        max: 12
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invbrx",
        invtransform: "dpur"
    },
    base: "Broad Axe"
}, {
    id: 7,
    kind: "item.unique",
    key: "The Chieftan",
    base_code: "btx",
    name: "The Chieftain",
    level: 26,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 150,
        max: 180
    }, {
        key: "res-all",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 3,
        min: 6,
        max: 6
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dmg-ltng",
        param_id: 5,
        min: 1,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 19
    },
    image: {
        invfile: "invbtxu",
        invtransform: ""
    },
    base: "Battle Axe"
}, {
    id: 8,
    kind: "item.unique",
    key: "Brainhew",
    base_code: "gax",
    name: "Brainhew",
    level: 34,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 14,
        max: 14
    }, {
        key: "mana",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "light",
        param_id: 3,
        min: 4,
        max: 4
    }, {
        key: "manasteal",
        param_id: 4,
        min: 10,
        max: 13
    }, {
        key: "dmg%",
        param_id: 5,
        min: 170,
        max: 200
    }, {
        key: "dmg-fire",
        param_id: 6,
        min: 15,
        max: 35
    }, {
        key: "swing2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invgaxu",
        invtransform: ""
    },
    base: "Great Axe"
}, {
    id: 9,
    kind: "item.unique",
    key: "The Humongous",
    base_code: "gix",
    name: "Humongous",
    level: 39,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 20,
        max: 30
    }, {
        key: "dmg-min",
        param_id: 2,
        min: 8,
        max: 8
    }, {
        key: "dmg-max",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "crush",
        param_id: 4,
        min: 33,
        max: 33
    }, {
        key: "ease",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 240
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "inc-splash-radius",
        param_id: 8,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invgix",
        invtransform: "blac"
    },
    base: "Giant Axe"
}, {
    id: 10,
    kind: "item.unique",
    key: "Iros Torch",
    base_code: "wnd",
    name: "Torch of Iro",
    level: 7,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 6,
        max: 6
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 5,
        max: 9
    }, {
        key: "light",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "enr",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "regen-mana",
        param_id: 6,
        min: 5,
        max: 5
    }, {
        key: "cast2",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invwndu",
        invtransform: ""
    },
    base: "Wand"
}, {
    id: 11,
    kind: "item.unique",
    key: "Maelstromwrath",
    base_code: "ywn",
    name: "Maelstrom",
    level: 19,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "mana",
        param_id: 2,
        min: 13,
        max: 13
    }, {
        key: "cast2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "skill",
        param_id: 4,
        param: 74,
        min: 1,
        max: 3
    }, {
        key: "skill",
        param_id: 5,
        param: 77,
        min: 1,
        max: 3
    }, {
        key: "skill",
        param_id: 6,
        param: 66,
        min: 1,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 76,
        min: 1,
        max: 3
    }, {
        key: "mana-kill",
        param_id: 8,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invywn",
        invtransform: "dblu"
    },
    base: "Yew Wand"
}, {
    id: 12,
    kind: "item.unique",
    key: "Gravenspine",
    base_code: "bwn",
    name: "Gravenspine",
    level: 27,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "cold-min",
        param_id: 3,
        min: 4,
        max: 4
    }, {
        key: "cold-max",
        param_id: 4,
        min: 8,
        max: 8
    }, {
        key: "cold-len",
        param_id: 5,
        min: 75,
        max: 75
    }, {
        key: "manasteal",
        param_id: 6,
        min: 5,
        max: 5
    }, {
        key: "nec",
        param_id: 7,
        min: 2,
        max: 2
    }, {
        key: "mana",
        param_id: 8,
        min: 25,
        max: 50
    }, {
        key: "skill",
        param_id: 9,
        param: 70,
        min: 1,
        max: 2
    }, {
        key: "skill",
        param_id: 10,
        param: 80,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invbwnu",
        invtransform: ""
    },
    base: "Bone Wand"
}, {
    id: 13,
    kind: "item.unique",
    key: "Umes Lament",
    base_code: "gwn",
    name: "Ume's Lament",
    level: 38,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "mana",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "cast2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "howl",
        param_id: 4,
        min: 64,
        max: 64
    }, {
        key: "skill",
        param_id: 5,
        param: 77,
        min: 3,
        max: 3
    }, {
        key: "skill",
        param_id: 6,
        param: 87,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invgwn",
        invtransform: "lblu"
    },
    base: "Grim Wand"
}, {
    id: 14,
    kind: "item.unique",
    key: "Felloak",
    base_code: "clb",
    name: "Felloak",
    level: 4,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 30,
        max: 50
    }, {
        key: "res-fire",
        param_id: 2,
        min: 15,
        max: 30
    }, {
        key: "knock",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "fire-min",
        param_id: 4,
        min: 6,
        max: 6
    }, {
        key: "fire-max",
        param_id: 5,
        min: 8,
        max: 8
    }, {
        key: "dmg%",
        param_id: 6,
        min: 70,
        max: 80
    }, {
        key: "skill",
        param_id: 7,
        param: 225,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invclbu",
        invtransform: ""
    },
    base: "Club"
}, {
    id: 15,
    kind: "item.unique",
    key: "Knell Striker",
    base_code: "scp",
    name: "Knell Striker",
    level: 7,
    modifiers: [{
        key: "crush",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "res-fire",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-pois",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "mana",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "att",
        param_id: 5,
        min: 35,
        max: 35
    }, {
        key: "dmg%",
        param_id: 6,
        min: 70,
        max: 80
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invscp",
        invtransform: "dred"
    },
    base: "Scepter"
}, {
    id: 16,
    kind: "item.unique",
    key: "Rusthandle",
    base_code: "gsc",
    name: "Rusthandle",
    level: 23,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg-norm",
        param_id: 2,
        min: 3,
        max: 7
    }, {
        key: "red-mag",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 8,
        max: 8
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 60
    }, {
        key: "dmg-undead",
        param_id: 6,
        min: 50,
        max: 60
    }, {
        key: "skill",
        param_id: 7,
        param: 111,
        min: 1,
        max: 3
    }, {
        key: "skill",
        param_id: 8,
        param: 103,
        min: 3,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invgsc",
        invtransform: "lgld"
    },
    base: "Grand Scepter"
}, {
    id: 17,
    kind: "item.unique",
    key: "Stormeye",
    base_code: "wsp",
    name: "Stormeye",
    level: 31,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 75,
        min: 17,
        max: 25
    }, {
        key: "regen",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 5,
        min: 80,
        max: 120
    }, {
        key: "skill",
        param_id: 6,
        param: 110,
        min: 3,
        max: 5
    }, {
        key: "skill",
        param_id: 7,
        param: 118,
        min: 3,
        max: 3
    }, {
        key: "skill",
        param_id: 8,
        param: 121,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invwsp",
        invtransform: "cred"
    },
    base: "War Scepter"
}, {
    id: 18,
    kind: "item.unique",
    key: "Stoutnail",
    base_code: "spc",
    name: "Stoutnail",
    level: 7,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 3,
        max: 10
    }, {
        key: "dmg%",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "vit",
        param_id: 3,
        min: 7,
        max: 14
    }, {
        key: "red-mag",
        param_id: 4,
        min: 2,
        max: 4
    }, {
        key: "skill",
        param_id: 5,
        param: 224,
        min: 3,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invspcu",
        invtransform: ""
    },
    base: "Spiked Club"
}, {
    id: 19,
    kind: "item.unique",
    key: "Crushflange",
    base_code: "mac",
    name: "Crushflange",
    level: 12,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "light",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "res-fire",
        param_id: 3,
        min: 40,
        max: 50
    }, {
        key: "dmg%",
        param_id: 4,
        min: 80,
        max: 100
    }, {
        key: "crush",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invmac",
        invtransform: "blac"
    },
    base: "Mace"
}, {
    id: 20,
    kind: "item.unique",
    key: "Bloodrise",
    base_code: "mst",
    name: "Bloodrise",
    level: 20,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "att%",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "openwounds",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "Deep-Wounds",
        param_id: 4,
        min: 6,
        max: 8
    }, {
        key: "swing1",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "skill",
        param_id: 6,
        param: 96,
        min: 3,
        max: 3
    }, {
        key: "lifesteal",
        param_id: 7,
        min: 4,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invmstu",
        invtransform: ""
    },
    base: "Morning Star"
}, {
    id: 21,
    kind: "item.unique",
    key: "The Generals Tan Do Li Ga",
    base_code: "fla",
    name: "The General's Tan Do Li Ga",
    level: 28,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 30,
        max: 40
    }, {
        key: "slow",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "ac",
        param_id: 4,
        min: 25,
        max: 75
    }, {
        key: "manasteal",
        param_id: 5,
        min: 5,
        max: 5
    }, {
        key: "dmg%",
        param_id: 6,
        min: 50,
        max: 60
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 21
    },
    image: {
        invfile: "invfla",
        invtransform: "dblu"
    },
    base: "Flail"
}, {
    id: 22,
    kind: "item.unique",
    key: "Ironstone",
    base_code: "whm",
    name: "Ironstone",
    level: 36,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 100,
        max: 150
    }, {
        key: "dmg%",
        param_id: 2,
        min: 100,
        max: 150
    }, {
        key: "ltng-min",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "str",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "*enr",
        param_id: 6,
        min: -5,
        max: -5
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invwhm",
        invtransform: "cblu"
    },
    base: "War Hammer"
}, {
    id: 23,
    kind: "item.unique",
    key: "Bonesob",
    base_code: "mau",
    name: "Bonesnap",
    level: 32,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 200,
        max: 300
    }, {
        key: "crush",
        param_id: 2,
        min: 20,
        max: 40
    }, {
        key: "res-fire",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "res-cold",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "dmg-undead",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 24
    },
    image: {
        invfile: "invmauu",
        invtransform: ""
    },
    base: "Maul"
}, {
    id: 24,
    kind: "item.unique",
    key: "Steeldriver",
    base_code: "gma",
    name: "Steeldriver",
    level: 39,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -50,
        max: -50
    }, {
        key: "swing3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "regen-stam",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 4,
        min: 180,
        max: 280
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invgma",
        invtransform: "cgrn"
    },
    base: "Great Maul"
}, {
    id: 25,
    kind: "item.unique",
    key: "Rixots Keen",
    base_code: "ssd",
    name: "Rixot's Keen",
    level: 3,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "att%",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "light",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "crush",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invssd",
        invtransform: "blac"
    },
    base: "Short Sword"
}, {
    id: 26,
    kind: "item.unique",
    key: "Blood Crescent",
    base_code: "scm",
    name: "Blood Crescent",
    level: 10,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 2,
        min: 40,
        max: 60
    }, {
        key: "Deep-Wounds",
        param_id: 3,
        min: 4,
        max: 4
    }, {
        key: "light",
        param_id: 4,
        min: 4,
        max: 4
    }, {
        key: "openwounds",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "swing2",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "lifesteal",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 7
    },
    image: {
        invfile: "invscmu",
        invtransform: ""
    },
    base: "Scimitar"
}, {
    id: 27,
    kind: "item.unique",
    key: "Krintizs Skewer",
    base_code: "sbr",
    name: "Skewer of Krintiz",
    level: 14,
    modifiers: [{
        key: "ignore-ac",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dex",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "manasteal",
        param_id: 4,
        min: 7,
        max: 7
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 70
    }, {
        key: "dmg-norm",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 10
    },
    image: {
        invfile: "inv9sbu",
        invtransform: ""
    },
    base: "Sabre"
}, {
    id: 28,
    kind: "item.unique",
    key: "Gleamscythe",
    base_code: "flc",
    name: "Gleamscythe",
    level: 18,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "mana",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "ac",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 100
    }, {
        key: "cold-min",
        param_id: 6,
        min: 3,
        max: 6
    }, {
        key: "cold-max",
        param_id: 7,
        min: 6,
        max: 10
    }, {
        key: "cold-len",
        param_id: 8,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invflcu",
        invtransform: ""
    },
    base: "Falchion"
}, {
    id: 29,
    kind: "item.unique",
    key: "Azurewrath",
    base_code: "crs",
    name: "Azurewrath",
    level: 18,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "mag%",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 100,
        min: 3,
        max: 6
    }, {
        key: "dmg%",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dur",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "dmg-mag",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invcrsu",
        invtransform: ""
    },
    base: "Crystal Sword"
}, {
    id: 30,
    kind: "item.unique",
    key: "Griswolds Edge",
    base_code: "bsd",
    name: "Griswold's Edge",
    level: 23,
    modifiers: [{
        key: "fire-min",
        param_id: 1,
        min: 20,
        max: 25
    }, {
        key: "fire-max",
        param_id: 2,
        min: 30,
        max: 35
    }, {
        key: "att",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "swing1",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 5,
        min: 80,
        max: 120
    }, {
        key: "str",
        param_id: 6,
        min: 12,
        max: 12
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invbsdu",
        invtransform: ""
    },
    base: "Broad Sword"
}, {
    id: 31,
    kind: "item.unique",
    key: "Hellplague",
    base_code: "lsd",
    name: "Hellplague",
    level: 30,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "pois-min",
        param_id: 3,
        min: 48,
        max: 48
    }, {
        key: "pois-max",
        param_id: 4,
        min: 96,
        max: 96
    }, {
        key: "pois-len",
        param_id: 5,
        min: 150,
        max: 150
    }, {
        key: "dmg%",
        param_id: 6,
        min: 70,
        max: 80
    }, {
        key: "dmg-fire",
        param_id: 7,
        min: 25,
        max: 75
    }, {
        key: "fireskill",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 22
    },
    image: {
        invfile: "invlsdu",
        invtransform: ""
    },
    base: "Long Sword"
}, {
    id: 32,
    kind: "item.unique",
    key: "Culwens Point",
    base_code: "wsd",
    name: "Culwen's Point",
    level: 39,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "res-pois-len",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "balance2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "att",
        param_id: 5,
        min: 60,
        max: 120
    }, {
        key: "dmg%",
        param_id: 6,
        min: 120,
        max: 150
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invwsd",
        invtransform: "whit"
    },
    base: "War Sword"
}, {
    id: 33,
    kind: "item.unique",
    key: "Shadowfang",
    base_code: "2hs",
    name: "Shadowfang",
    level: 16,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 9,
        max: 9
    }, {
        key: "res-cold",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "light",
        param_id: 3,
        min: -2,
        max: -2
    }, {
        key: "dmg-cold",
        param_id: 4,
        param: 150,
        min: 10,
        max: 30
    }, {
        key: "dmg%",
        param_id: 5,
        min: 120,
        max: 160
    }, {
        key: "lifesteal",
        param_id: 6,
        min: 9,
        max: 9
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "inv2hsu",
        invtransform: ""
    },
    base: "Two-Handed Sword"
}, {
    id: 34,
    kind: "item.unique",
    key: "Soulflay",
    base_code: "clm",
    name: "Soulflay",
    level: 26,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 4,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 4,
        max: 10
    }, {
        key: "dmg%",
        param_id: 3,
        min: 100,
        max: 130
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 19
    },
    image: {
        invfile: "invclm",
        invtransform: "dgrn"
    },
    base: "Claymore"
}, {
    id: 35,
    kind: "item.unique",
    key: "Kinemils Awl",
    base_code: "gis",
    name: "Kinemil's Awl",
    level: 31,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 100,
        max: 150
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "fire-min",
        param_id: 3,
        min: 16,
        max: 16
    }, {
        key: "fire-max",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 5,
        min: 80,
        max: 100
    }, {
        key: "skill",
        param_id: 6,
        param: 102,
        min: 4,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invgisu",
        invtransform: ""
    },
    base: "Giant Sword"
}, {
    id: 36,
    kind: "item.unique",
    key: "Blacktongue",
    base_code: "bsw",
    name: "Blacktongue",
    level: 35,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 75,
        min: 1022,
        max: 1226
    }, {
        key: "noheal",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "att",
        param_id: 3,
        min: 50,
        max: 100
    }, {
        key: "res-pois",
        param_id: 4,
        min: 30,
        max: 50
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 80
    }, {
        key: "swing2",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "invbswu",
        invtransform: ""
    },
    base: "Bastard Sword"
}, {
    id: 37,
    kind: "item.unique",
    key: "Ripsaw",
    base_code: "flb",
    name: "Ripsaw",
    level: 35,
    modifiers: [{
        key: "openwounds",
        param_id: 1,
        min: 80,
        max: 80
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "manasteal",
        param_id: 3,
        min: 6,
        max: 6
    }, {
        key: "dmg%",
        param_id: 4,
        min: 120,
        max: 160
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "invflb",
        invtransform: "cblu"
    },
    base: "Flamberge"
}, {
    id: 38,
    kind: "item.unique",
    key: "The Patriarch",
    base_code: "gsd",
    name: "The Patriarch",
    level: 39,
    modifiers: [{
        key: "red-dmg",
        param_id: 1,
        min: 2,
        max: 5
    }, {
        key: "red-mag",
        param_id: 2,
        min: 2,
        max: 5
    }, {
        key: "stupidity",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "gold%",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dmg%",
        param_id: 5,
        min: 260,
        max: 290
    }, {
        key: "str",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "swing2",
        param_id: 7,
        min: -20,
        max: -20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invgsdu",
        invtransform: ""
    },
    base: "Great Sword"
}, {
    id: 39,
    kind: "item.unique",
    key: "Gull",
    base_code: "dgr",
    name: "Gull",
    level: 6,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "mag%",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "mana",
        param_id: 4,
        min: -5,
        max: -5
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 4
    },
    image: {
        invfile: "invdgr",
        invtransform: "lgry"
    },
    base: "Dagger"
}, {
    id: 40,
    kind: "item.unique",
    key: "The Diggler",
    base_code: "dir",
    name: "The Diggler",
    level: 15,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 2,
        min: 70,
        max: 90
    }, {
        key: "swing3",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "res-cold",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "res-fire",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "ignore-ac",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invdir",
        invtransform: "dgry"
    },
    base: "Dirk"
}, {
    id: 41,
    kind: "item.unique",
    key: "The Jade Tan Do",
    base_code: "kri",
    name: "The Jade Tan Do",
    level: 26,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 100,
        max: 150
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dmg-pois",
        param_id: 3,
        param: 50,
        min: 460,
        max: 460
    }, {
        key: "res-pois",
        param_id: 4,
        min: 50,
        max: 75
    }, {
        key: "res-pois-max",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "skill",
        param_id: 6,
        param: 73,
        min: 2,
        max: 2
    }, {
        key: "poisskill",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 19
    },
    image: {
        invfile: "invkrsu",
        invtransform: ""
    },
    base: "Kris"
}, {
    id: 42,
    kind: "item.unique",
    key: "Irices Shard",
    base_code: "bld",
    name: "Spectral Shard",
    level: 34,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "mana",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 3,
        min: 55,
        max: 55
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invbld",
        invtransform: "dblu"
    },
    base: "Blade"
}, {
    id: 43,
    kind: "item.unique",
    key: "The Dragon Chang",
    base_code: "spr",
    name: "The Dragon Chang",
    level: 11,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "dmg-min",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "light",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dmg-fire",
        param_id: 5,
        min: 3,
        max: 6
    }, {
        key: "skill",
        param_id: 6,
        param: 19,
        min: 4,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invspr",
        invtransform: "dpur"
    },
    base: "Spear"
}, {
    id: 44,
    kind: "item.unique",
    key: "Razortine",
    base_code: "tri",
    name: "Razortine",
    level: 16,
    modifiers: [{
        key: "slow",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "reduce-ac",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "str",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "dex",
        param_id: 4,
        min: 8,
        max: 8
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 6,
        min: 30,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invtriu",
        invtransform: ""
    },
    base: "Trident"
}, {
    id: 45,
    kind: "item.unique",
    key: "Bloodthief",
    base_code: "brn",
    name: "Bloodthief",
    level: 23,
    modifiers: [{
        key: "openwounds",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 8,
        max: 12
    }, {
        key: "hp",
        param_id: 4,
        min: 26,
        max: 26
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 110
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invbrn",
        invtransform: "whit"
    },
    base: "Brandistock"
}, {
    id: 46,
    kind: "item.unique",
    key: "Lance of Yaggai",
    base_code: "spt",
    name: "Lance of Yaggai",
    level: 30,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 24,
        max: 24
    }, {
        key: "ltng-min",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 3,
        min: 60,
        max: 60
    }, {
        key: "res-all",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "skill",
        param_id: 6,
        param: 14,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 24,
        min: 1,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 22
    },
    image: {
        invfile: "invspt",
        invtransform: "lred"
    },
    base: "Spetum"
}, {
    id: 47,
    kind: "item.unique",
    key: "The Tannr Gorerod",
    base_code: "pik",
    name: "The Tannr Gorerod",
    level: 36,
    modifiers: [{
        key: "fire-min",
        param_id: 1,
        min: 23,
        max: 23
    }, {
        key: "fire-max",
        param_id: 2,
        min: 54,
        max: 54
    }, {
        key: "res-fire-max",
        param_id: 3,
        min: 5,
        max: 10
    }, {
        key: "hp",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "att",
        param_id: 5,
        min: 80,
        max: 160
    }, {
        key: "light",
        param_id: 6,
        min: 3,
        max: 3
    }, {
        key: "res-fire",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 8,
        min: 160,
        max: 180
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invpik",
        invtransform: "lgry"
    },
    base: "Pike"
}, {
    id: 48,
    kind: "item.unique",
    key: "Dimoaks Hew",
    base_code: "bar",
    name: "Dimoak's Hew",
    level: 11,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "ac",
        param_id: 4,
        min: -8,
        max: -8
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invbar",
        invtransform: "blac"
    },
    base: "Bardiche"
}, {
    id: 49,
    kind: "item.unique",
    key: "Steelgoad",
    base_code: "vou",
    name: "Steelgoad",
    level: 19,
    modifiers: [{
        key: "howl",
        param_id: 1,
        min: 14,
        max: 14
    }, {
        key: "deadly",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "res-all",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 80
    }, {
        key: "dur",
        param_id: 6,
        min: 20,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invvou",
        invtransform: "cgrn"
    },
    base: "Voulge"
}, {
    id: 50,
    kind: "item.unique",
    key: "Soul Harvest",
    base_code: "scy",
    name: "Soul Harvest",
    level: 26,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 50,
        min: 820,
        max: 820
    }, {
        key: "att",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "res-all",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 4,
        min: 50,
        max: 80
    }, {
        key: "manasteal",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "skill",
        param_id: 6,
        param: 381,
        min: 4,
        max: 6
    }, {
        key: "cast2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 19
    },
    image: {
        invfile: "invscyu",
        invtransform: ""
    },
    base: "Scythe"
}, {
    id: 51,
    kind: "item.unique",
    key: "The Battlebranch",
    base_code: "pax",
    name: "The Battlebranch",
    level: 34,
    modifiers: [{
        key: "swing3",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 3,
        min: 70,
        max: 130
    }, {
        key: "att",
        param_id: 4,
        min: 50,
        max: 100
    }, {
        key: "lifesteal",
        param_id: 5,
        min: 7,
        max: 7
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invpax",
        invtransform: "lblu"
    },
    base: "Poleaxe"
}, {
    id: 52,
    kind: "item.unique",
    key: "Woestave",
    base_code: "hal",
    name: "Woestave",
    level: 38,
    modifiers: [{
        key: "slow",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "openwounds",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "stupidity",
        param_id: 3,
        min: 3,
        max: 3
    }, {
        key: "dmg-ac",
        param_id: 4,
        min: -50,
        max: -50
    }, {
        key: "freeze",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "light",
        param_id: 6,
        min: -3,
        max: -3
    }, {
        key: "Deep-Wounds",
        param_id: 7,
        min: 30,
        max: 40
    }, {
        key: "dmg%",
        param_id: 8,
        min: 40,
        max: 80
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invhal",
        invtransform: "dblu"
    },
    base: "Halberd"
}, {
    id: 53,
    kind: "item.unique",
    key: "The Grim Reaper",
    base_code: "wsc",
    name: "The Grim Reaper",
    level: 39,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "extra-pois",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "manasteal",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "dmg%",
        param_id: 5,
        min: 90,
        max: 140
    }, {
        key: "dmg-min",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invwsc",
        invtransform: "lpur"
    },
    base: "War Scythe"
}, {
    id: 54,
    kind: "item.unique",
    key: "Bane Ash",
    base_code: "sst",
    name: "Bane Ash",
    level: 7,
    modifiers: [{
        key: "cast-skill",
        param_id: 1,
        param: 36,
        min: 20,
        max: 8
    }, {
        key: "res-fire",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "mana",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 60
    }, {
        key: "skill",
        param_id: 6,
        param: 36,
        min: 3,
        max: 3
    }, {
        key: "fireskill",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "cast2",
        param_id: 8,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invsst",
        invtransform: "lgrn"
    },
    base: "Short Staff"
}, {
    id: 55,
    kind: "item.unique",
    key: "Serpent Lord",
    base_code: "lst",
    name: "Serpent Lord",
    level: 12,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 75,
        min: 40,
        max: 40
    }, {
        key: "res-pois",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "cast-skill",
        param_id: 3,
        param: 235,
        min: 5,
        max: 3
    }, {
        key: "mana",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 5,
        min: 30,
        max: 40
    }, {
        key: "manasteal",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "reduce-ac",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "cast-skill",
        param_id: 8,
        param: 225,
        min: 30,
        max: 15
    }, {
        key: "cast2",
        param_id: 9,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invlst",
        invtransform: "cgrn"
    },
    base: "Long Staff"
}, {
    id: 56,
    kind: "item.unique",
    key: "Lazarus Spire",
    base_code: "cst",
    name: "Spire of Lazarus",
    level: 24,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 50,
        max: 75
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "enr",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "skill",
        param_id: 4,
        param: 53,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 5,
        param: 49,
        min: 2,
        max: 2
    }, {
        key: "cast-skill",
        param_id: 6,
        param: 42,
        min: 30,
        max: 15
    }, {
        key: "regen-mana",
        param_id: 7,
        min: 35,
        max: 45
    }, {
        key: "dmg-ltng",
        param_id: 8,
        min: 1,
        max: 280
    }, {
        key: "allskills",
        param_id: 9,
        min: 2,
        max: 3
    }, {
        key: "cast2",
        param_id: 10,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 18
    },
    image: {
        invfile: "invcstu",
        invtransform: ""
    },
    base: "Gnarled Staff"
}, {
    id: 57,
    kind: "item.unique",
    key: "The Salamander",
    base_code: "bst",
    name: "The Salamander",
    level: 28,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 15,
        max: 32
    }, {
        key: "res-fire",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "skill",
        param_id: 3,
        param: 51,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 4,
        param: 47,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 5,
        param: 37,
        min: 2,
        max: 2
    }, {
        key: "fireskill",
        param_id: 6,
        min: 2,
        max: 3
    }, {
        key: "cast-skill",
        param_id: 7,
        param: 383,
        min: 20,
        max: 14
    }, {
        key: "cast2",
        param_id: 8,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 21
    },
    image: {
        invfile: "invbst",
        invtransform: "dred"
    },
    base: "Battle Staff"
}, {
    id: 58,
    kind: "item.unique",
    key: "The Iron Jang Bong",
    base_code: "wst",
    name: "The Iron Jang Bong",
    level: 38,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "cast3",
        param_id: 2,
        min: 30,
        max: 50
    }, {
        key: "dmg%",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "att%",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "cast-skill",
        param_id: 5,
        param: 48,
        min: 15,
        max: 20
    }, {
        key: "cast-skill",
        param_id: 6,
        param: 46,
        min: 15,
        max: 24
    }, {
        key: "cast-skill",
        param_id: 7,
        param: 44,
        min: 15,
        max: 24
    }, {
        key: "allskills",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "cast2",
        param_id: 9,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invwst",
        invtransform: "dyel"
    },
    base: "War Staff"
}, {
    id: 59,
    kind: "item.unique",
    key: "Pluckeye",
    base_code: "sbw",
    name: "Pluckeye",
    level: 10,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 28,
        max: 28
    }, {
        key: "dmg%",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "hp",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "light",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "manasteal",
        param_id: 5,
        min: 3,
        max: 3
    }, {
        key: "mana-kill",
        param_id: 6,
        min: 2,
        max: 2
    }, {
        key: "oskill",
        param_id: 7,
        param: 11,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 7
    },
    image: {
        invfile: "invsbw",
        invtransform: "cblu"
    },
    base: "Short Bow"
}, {
    id: 60,
    kind: "item.unique",
    key: "Witherstring",
    base_code: "hbw",
    name: "Witherstring",
    level: 18,
    modifiers: [{
        key: "swing3",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "dmg-min",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "dmg-max",
        param_id: 3,
        min: 6,
        max: 6
    }, {
        key: "att",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "magicarrow",
        param_id: 5,
        min: 6,
        max: 6
    }, {
        key: "dmg%",
        param_id: 6,
        min: 40,
        max: 50
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invhbw",
        invtransform: "lred"
    },
    base: "Hunter's Bow"
}, {
    id: 61,
    kind: "item.unique",
    key: "Rimeraven",
    base_code: "lbw",
    name: "Raven Claw",
    level: 20,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "explosivearrow",
        param_id: 3,
        min: 3,
        max: 3
    }, {
        key: "str",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 70
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invlbw",
        invtransform: "dred"
    },
    base: "Long Bow"
}, {
    id: 62,
    kind: "item.unique",
    key: "Piercerib",
    base_code: "cbw",
    name: "Rogue's Bow",
    level: 27,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "deadly",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "att",
        param_id: 3,
        min: 60,
        max: 60
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dmg%",
        param_id: 5,
        min: 80,
        max: 120
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "skill",
        param_id: 7,
        param: 22,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invcbwu",
        invtransform: ""
    },
    base: "Composite Bow"
}, {
    id: 63,
    kind: "item.unique",
    key: "Pullspite",
    base_code: "sbb",
    name: "Stormstrike",
    level: 34,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 60,
        max: 60
    }, {
        key: "str",
        param_id: 3,
        min: 8,
        max: 8
    }, {
        key: "att",
        param_id: 4,
        min: 28,
        max: 84
    }, {
        key: "pierce",
        param_id: 5,
        min: 25,
        max: 50
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 7,
        min: 140,
        max: 170
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invsbbu",
        invtransform: ""
    },
    base: "Short Battle Bow"
}, {
    id: 64,
    kind: "item.unique",
    key: "Wizendraw",
    base_code: "lbb",
    name: "Wizendraw",
    level: 35,
    modifiers: [{
        key: "magicarrow",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "mana",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "swing2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "res-cold",
        param_id: 4,
        min: 26,
        max: 26
    }, {
        key: "att",
        param_id: 5,
        min: 50,
        max: 100
    }, {
        key: "dmg%",
        param_id: 6,
        min: 70,
        max: 80
    }, {
        key: "enr",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "pierce-cold",
        param_id: 8,
        min: 20,
        max: 35
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "invlbb",
        invtransform: "dgrn"
    },
    base: "Long Battle Bow"
}, {
    id: 65,
    kind: "item.unique",
    key: "Hellclap",
    base_code: "swb",
    name: "Hellclap",
    level: 36,
    modifiers: [{
        key: "swing1",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "fire-min",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "fire-max",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 50,
        max: 75
    }, {
        key: "res-fire",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "dex",
        param_id: 6,
        min: 12,
        max: 12
    }, {
        key: "dmg%",
        param_id: 7,
        min: 120,
        max: 160
    }, {
        key: "fireskill",
        param_id: 8,
        min: 2,
        max: 3
    }, {
        key: "pierce",
        param_id: 9,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invswbu",
        invtransform: ""
    },
    base: "Short War Bow"
}, {
    id: 66,
    kind: "item.unique",
    key: "Blastbark",
    base_code: "lwb",
    name: "Blastbark",
    level: 38,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "str",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "ama",
        param_id: 3,
        min: 1,
        max: 2
    }, {
        key: "manasteal",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "oskill",
        param_id: 5,
        param: 16,
        min: 2,
        max: 3
    }, {
        key: "knock",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "pierce",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invlwb",
        invtransform: "lyel"
    },
    base: "Long War Bow"
}, {
    id: 67,
    kind: "item.unique",
    key: "Leadcrow",
    base_code: "lxb",
    name: "Leadcrow",
    level: 12,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "hp",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 3,
        min: 70,
        max: 70
    }, {
        key: "res-pois",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "deadly",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "att",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invlxbu",
        invtransform: ""
    },
    base: "Light Crossbow"
}, {
    id: 68,
    kind: "item.unique",
    key: "Ichorsting",
    base_code: "mxb",
    name: "Ichorsting",
    level: 24,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 75,
        min: 340,
        max: 340
    }, {
        key: "dex",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "pierce",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "dmg%",
        param_id: 5,
        min: 50,
        max: 80
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 18
    },
    image: {
        invfile: "invmxbu",
        invtransform: ""
    },
    base: "Crossbow"
}, {
    id: 69,
    kind: "item.unique",
    key: "Hellcast",
    base_code: "hxb",
    name: "Hellcast",
    level: 36,
    modifiers: [{
        key: "explosivearrow",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "res-fire-max",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "res-fire",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "att",
        param_id: 4,
        min: 70,
        max: 70
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 6,
        min: 70,
        max: 80
    }, {
        key: "dmg-fire",
        param_id: 7,
        min: 30,
        max: 50
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invhxbu",
        invtransform: ""
    },
    base: "Heavy Crossbow"
}, {
    id: 70,
    kind: "item.unique",
    key: "Doomspittle",
    base_code: "rxb",
    name: "Doomslinger",
    level: 38,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 1,
        max: 2
    }, {
        key: "pierce",
        param_id: 2,
        min: 35,
        max: 35
    }, {
        key: "swing3",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "hp",
        param_id: 4,
        min: 30,
        max: 40
    }, {
        key: "dmg%",
        param_id: 5,
        min: 90,
        max: 140
    }, {
        key: "hit-skill",
        param_id: 6,
        param: 47,
        min: 45,
        max: 12
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invrxbu",
        invtransform: ""
    },
    base: "Repeating Crossbow"
}, {
    id: 71,
    kind: "item.unique",
    key: "War Bonnet",
    base_code: "cap",
    name: "Biggin's Bonnet",
    level: 4,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "att",
        param_id: 2,
        min: 30,
        max: 50
    }, {
        key: "dmg%",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "mana",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "ac",
        param_id: 5,
        min: 14,
        max: 14
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invcapu",
        invtransform: ""
    },
    base: "Cap"
}, {
    id: 72,
    kind: "item.unique",
    key: "Tarnhelm",
    base_code: "skp",
    name: "Tarnhelm",
    level: 20,
    modifiers: [{
        key: "gold%",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "mag%",
        param_id: 2,
        min: 25,
        max: 50
    }, {
        key: "allskills",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invskp",
        invtransform: "oran"
    },
    base: "Skull Cap"
}, {
    id: 73,
    kind: "item.unique",
    key: "Coif of Glory",
    base_code: "hlm",
    name: "Coif of Glory",
    level: 19,
    modifiers: [{
        key: "light-thorns",
        param_id: 1,
        min: 17,
        max: 17
    }, {
        key: "stupidity",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "res-ltng",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "ac-miss",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "heal-kill",
        param_id: 6,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invhlmu",
        invtransform: ""
    },
    base: "Helm"
}, {
    id: 74,
    kind: "item.unique",
    key: "Duskdeep",
    base_code: "fhl",
    name: "Duskdeep",
    level: 23,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: -2,
        max: -2
    }, {
        key: "res-all",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 7,
        max: 7
    }, {
        key: "dmg-max",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "ac%",
        param_id: 6,
        min: 30,
        max: 50
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invfhlu",
        invtransform: ""
    },
    base: "Full Helm"
}, {
    id: 75,
    kind: "item.unique",
    key: "Wormskull",
    base_code: "bhm",
    name: "Wormskull",
    level: 28,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "mana",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "res-pois",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "skilltab",
        param_id: 5,
        param: 7,
        min: 1,
        max: 1
    }, {
        key: "dmg-pois",
        param_id: 6,
        param: 50,
        min: 306,
        max: 306
    }],
    requirements: {
        level: 21
    },
    image: {
        invfile: "invbhmu",
        invtransform: ""
    },
    base: "Bone Helm"
}, {
    id: 76,
    kind: "item.unique",
    key: "Howltusk",
    base_code: "ghm",
    name: "Howltusk",
    level: 34,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "thorns",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "ac%",
        param_id: 3,
        min: 80,
        max: 80
    }, {
        key: "dmg-to-mana",
        param_id: 4,
        min: 35,
        max: 35
    }, {
        key: "swing2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "hit-skill",
        param_id: 6,
        min: 10,
        max: 5
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invghm",
        invtransform: "dgry"
    },
    base: "Great Helm"
}, {
    id: 77,
    kind: "item.unique",
    key: "Undead Crown",
    base_code: "crn",
    name: "Undead Crown",
    level: 39,
    modifiers: [{
        key: "lifesteal",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "ac",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "res-pois",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "half-freeze",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "dmg-undead",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "att-undead",
        param_id: 6,
        min: 50,
        max: 100
    }, {
        key: "skill",
        param_id: 7,
        param: 69,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 8,
        param: 70,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invcrn",
        invtransform: "blac"
    },
    base: "Crown"
}, {
    id: 78,
    kind: "item.unique",
    key: "The Face of Horror",
    base_code: "msk",
    name: "The Face of Horror",
    level: 27,
    modifiers: [{
        key: "howl",
        param_id: 1,
        min: 64,
        max: 64
    }, {
        key: "str",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-all",
        param_id: 3,
        min: 15,
        max: 20
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "ac",
        param_id: 5,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invmsk",
        invtransform: "lblu"
    },
    base: "Mask"
}, {
    id: 79,
    kind: "item.unique",
    key: "Greyform",
    base_code: "qui",
    name: "Greyform",
    level: 10,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "res-cold",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-fire",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 5,
        min: 5,
        max: 5
    }, {
        key: "ac",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 7
    },
    image: {
        invfile: "invqlt",
        invtransform: "lgry"
    },
    base: "Quilted Armor"
}, {
    id: 80,
    kind: "item.unique",
    key: "Blinkbats Form",
    base_code: "lea",
    name: "Blinkbat's Form",
    level: 16,
    modifiers: [{
        key: "ac-miss",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "move2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "fire-min",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "fire-max",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "balance2",
        param_id: 6,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invlea",
        invtransform: "dred"
    },
    base: "Leather Armor"
}, {
    id: 81,
    kind: "item.unique",
    key: "The Centurion",
    base_code: "hla",
    name: "The Centurion",
    level: 19,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "att",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "hp",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "mana",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "block",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "regen",
        param_id: 7,
        min: 5,
        max: 15
    }, {
        key: "dmg%",
        param_id: 8,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invhla",
        invtransform: "cred"
    },
    base: "Hard Leather Armor"
}, {
    id: 82,
    kind: "item.unique",
    key: "Twitchthroe",
    base_code: "stu",
    name: "Twitchthroe",
    level: 22,
    modifiers: [{
        key: "swing2",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "block",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "str",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "balance2",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 16
    },
    image: {
        invfile: "invstu",
        invtransform: "lgrn"
    },
    base: "Studded Leather"
}, {
    id: 83,
    kind: "item.unique",
    key: "Darkglow",
    base_code: "rng",
    name: "Darkglow",
    level: 19,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 60,
        max: 120
    }, {
        key: "res-all-max",
        param_id: 2,
        min: 2,
        max: 5
    }, {
        key: "light",
        param_id: 3,
        min: 3,
        max: 3
    }, {
        key: "ac-hth",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "res-all",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "ac%",
        param_id: 6,
        min: 70,
        max: 100
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invrng",
        invtransform: "dgrn"
    },
    base: "Ring Mail"
}, {
    id: 84,
    kind: "item.unique",
    key: "Hawkmail",
    base_code: "scl",
    name: "Hawkmail",
    level: 20,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 80,
        max: 100
    }, {
        key: "res-cold-max",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "res-cold",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "nofreeze",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "move2",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "oskill",
        param_id: 6,
        param: 221,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invscl",
        invtransform: "cgrn"
    },
    base: "Scale Mail"
}, {
    id: 85,
    kind: "item.unique",
    key: "Sparking Mail",
    base_code: "chn",
    name: "Sparking Mail",
    level: 23,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 75,
        max: 85
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 45
    }, {
        key: "light-thorns",
        param_id: 3,
        min: 20,
        max: 28
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "extra-ltng",
        param_id: 5,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invchn",
        invtransform: "lyel"
    },
    base: "Chain Mail"
}, {
    id: 86,
    kind: "item.unique",
    key: "Venomsward",
    base_code: "brs",
    name: "Venom Ward",
    level: 27,
    modifiers: [{
        key: "res-pois-max",
        param_id: 1,
        min: 5,
        max: 8
    }, {
        key: "res-pois-len",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "res-pois",
        param_id: 3,
        min: 40,
        max: 60
    }, {
        key: "light",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 5,
        min: 60,
        max: 100
    }, {
        key: "pierce-pois",
        param_id: 6,
        min: 6,
        max: 12
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invbrs",
        invtransform: "dyel"
    },
    base: "Breast Plate"
}, {
    id: 87,
    kind: "item.unique",
    key: "Iceblink",
    base_code: "spl",
    name: "Iceblink",
    level: 30,
    modifiers: [{
        key: "freeze",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "res-cold",
        param_id: 2,
        min: 20,
        max: 35
    }, {
        key: "light",
        param_id: 3,
        min: 4,
        max: 4
    }, {
        key: "red-mag",
        param_id: 4,
        min: 2,
        max: 6
    }, {
        key: "ac%",
        param_id: 5,
        min: 70,
        max: 80
    }, {
        key: "coldskill",
        param_id: 6,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 22
    },
    image: {
        invfile: "invspl",
        invtransform: "lgld"
    },
    base: "Splint Mail"
}, {
    id: 88,
    kind: "item.unique",
    key: "Boneflesh",
    base_code: "plt",
    name: "Boneflesh",
    level: 35,
    modifiers: [{
        key: "lifesteal",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "ac%",
        param_id: 2,
        min: 100,
        max: 120
    }, {
        key: "att",
        param_id: 3,
        min: 235,
        max: 235
    }, {
        key: "openwounds",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "Deep-Wounds",
        param_id: 5,
        min: 24,
        max: 32
    }, {
        key: "gethit-skill",
        param_id: 6,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "invplt",
        invtransform: "dgld"
    },
    base: "Plate Mail"
}, {
    id: 89,
    kind: "item.unique",
    key: "Rockfleece",
    base_code: "fld",
    name: "Rockfleece",
    level: 38,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -10,
        max: -10
    }, {
        key: "ac%",
        param_id: 2,
        min: 100,
        max: 130
    }, {
        key: "red-dmg%",
        param_id: 3,
        min: 10,
        max: 15
    }, {
        key: "red-dmg",
        param_id: 4,
        min: 5,
        max: 10
    }, {
        key: "str",
        param_id: 5,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invfld",
        invtransform: "dgry"
    },
    base: "Field Plate"
}, {
    id: 90,
    kind: "item.unique",
    key: "Rattlecage",
    base_code: "gth",
    name: "Rattlecage",
    level: 39,
    modifiers: [{
        key: "howl",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "att",
        param_id: 2,
        min: 100,
        max: 145
    }, {
        key: "crush",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 4,
        min: 200,
        max: 200
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 90
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invgth",
        invtransform: "dpur"
    },
    base: "Gothic Plate"
}, {
    id: 91,
    kind: "item.unique",
    key: "Goldskin",
    base_code: "ful",
    name: "Goldskin",
    level: 38,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "res-all",
        param_id: 2,
        min: 35,
        max: 35
    }, {
        key: "thorns",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "light",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "gold%",
        param_id: 5,
        min: 100,
        max: 200
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invfulu",
        invtransform: ""
    },
    base: "Full Plate Mail"
}, {
    id: 92,
    kind: "item.unique",
    key: "Victors Silk",
    base_code: "aar",
    name: "Silks of the Victor",
    level: 38,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 2,
        max: 5
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "light",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 4,
        min: 100,
        max: 120
    }, {
        key: "move2",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "heal-kill",
        param_id: 6,
        min: 2,
        max: 4
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invaaru",
        invtransform: ""
    },
    base: "Ancient Armor"
}, {
    id: 93,
    kind: "item.unique",
    key: "Heavenly Garb",
    base_code: "ltp",
    name: "Heavenly Garb",
    level: 39,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "res-all",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "enr",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "dmg-undead",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "att-undead",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "aura",
        param_id: 7,
        min: 4,
        max: 6
    }, {
        key: "magskill",
        param_id: 8,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invltp",
        invtransform: "cblu"
    },
    base: "Light Plate"
}, {
    id: 94,
    kind: "item.unique",
    key: "Pelta Lunata",
    base_code: "buc",
    name: "Pelta Lunata",
    level: 3,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "vit",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "str",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "enr",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 5,
        min: 30,
        max: 40
    }, {
        key: "block",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "block2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "dur",
        param_id: 8,
        min: 8,
        max: 12
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invbucu",
        invtransform: ""
    },
    base: "Buckler"
}, {
    id: 95,
    kind: "item.unique",
    key: "Umbral Disk",
    base_code: "sml",
    name: "Umbral Disk",
    level: 12,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "ac",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "hp",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 4,
        max: 8
    }, {
        key: "ac%",
        param_id: 6,
        min: 40,
        max: 50
    }, {
        key: "block",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "dur",
        param_id: 8,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invsmlu",
        invtransform: ""
    },
    base: "Small Shield"
}, {
    id: 96,
    kind: "item.unique",
    key: "Stormguild",
    base_code: "lrg",
    name: "Stormguild",
    level: 18,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 1,
        max: 3
    }, {
        key: "res-ltng",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "dmg-ltng",
        param_id: 4,
        min: 1,
        max: 18
    }, {
        key: "ac%",
        param_id: 5,
        min: 50,
        max: 60
    }, {
        key: "block",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "light-thorns",
        param_id: 7,
        min: 9,
        max: 9
    }, {
        key: "dur",
        param_id: 8,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invlrgu",
        invtransform: ""
    },
    base: "Large Shield"
}, {
    id: 97,
    kind: "item.unique",
    key: "Wall of the Eyeless",
    base_code: "bsh",
    name: "Wall of the Eyeless",
    level: 27,
    modifiers: [{
        key: "mana-kill",
        param_id: 1,
        min: 3,
        max: 5
    }, {
        key: "manasteal",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "cast2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "res-pois",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 30,
        max: 40
    }, {
        key: "ac",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "res-cold",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "res-fire",
        param_id: 8,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invbshu",
        invtransform: ""
    },
    base: "Bone Shield"
}, {
    id: 98,
    kind: "item.unique",
    key: "Swordback Hold",
    base_code: "spk",
    name: "Swordback Hold",
    level: 20,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 25,
        max: 32
    }, {
        key: "block",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "openwounds",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "bloody",
        param_id: 4,
        min: 3,
        max: 5
    }, {
        key: "ac%",
        param_id: 5,
        min: 30,
        max: 60
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 8,
        max: 8
    }, {
        key: "ac",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invspku",
        invtransform: ""
    },
    base: "Spiked Shield"
}, {
    id: 99,
    kind: "item.unique",
    key: "Steelclash",
    base_code: "kit",
    name: "Steelclash",
    level: 23,
    modifiers: [{
        key: "block",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dur",
        param_id: 3,
        min: 15,
        max: 20
    }, {
        key: "light",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "ac%",
        param_id: 5,
        min: 60,
        max: 100
    }, {
        key: "block2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "res-all",
        param_id: 7,
        min: 5,
        max: 10
    }, {
        key: "ac",
        param_id: 8,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invkitu",
        invtransform: ""
    },
    base: "Kite Shield"
}, {
    id: 100,
    kind: "item.unique",
    key: "Bverrit Keep",
    base_code: "tow",
    name: "Bverrit Keep",
    level: 26,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "res-fire",
        param_id: 2,
        min: 30,
        max: 50
    }, {
        key: "str",
        param_id: 3,
        min: 5,
        max: 15
    }, {
        key: "red-mag",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "ac%",
        param_id: 5,
        min: 80,
        max: 120
    }, {
        key: "block",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "dur",
        param_id: 7,
        min: 80,
        max: 100
    }, {
        key: "red-dmg%",
        param_id: 8,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 19
    },
    image: {
        invfile: "invtowu",
        invtransform: ""
    },
    base: "Tower Shield"
}, {
    id: 101,
    kind: "item.unique",
    key: "The Ward",
    base_code: "gts",
    name: "The Ward",
    level: 35,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "red-mag",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "str",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "block",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 5,
        min: 100,
        max: 100
    }, {
        key: "res-all",
        param_id: 6,
        min: 30,
        max: 50
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "invgtsu",
        invtransform: ""
    },
    base: "Gothic Shield"
}, {
    id: 102,
    kind: "item.unique",
    key: "The Hand of Broc",
    base_code: "lgl",
    name: "The Hand of Broc",
    level: 7,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "res-pois",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "mana",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "dmg%",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invlgl",
        invtransform: "cblu"
    },
    base: "Leather Gloves"
}, {
    id: 103,
    kind: "item.unique",
    key: "Bloodfist",
    base_code: "vgl",
    name: "Bloodfist",
    level: 12,
    modifiers: [{
        key: "dmg-max",
        param_id: 1,
        min: 5,
        max: 10
    }, {
        key: "hp",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "balance2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "ac",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "swing2",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invvgl",
        invtransform: "oran"
    },
    base: "Heavy Gloves"
}, {
    id: 104,
    kind: "item.unique",
    key: "Chance Guards",
    base_code: "mgl",
    name: "Chance Guards",
    level: 20,
    modifiers: [{
        key: "gold%",
        param_id: 1,
        min: 200,
        max: 200
    }, {
        key: "mag%",
        param_id: 2,
        min: 25,
        max: 40
    }, {
        key: "att",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "light",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "mana-kill",
        param_id: 7,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invmgl",
        invtransform: "lred"
    },
    base: "Chain Gloves"
}, {
    id: 105,
    kind: "item.unique",
    key: "Magefist",
    base_code: "tgl",
    name: "Magefist",
    level: 31,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "fireskill",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-fire",
        param_id: 4,
        min: 6,
        max: 36
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgry"
    },
    base: "Light Gauntlets"
}, {
    id: 106,
    kind: "item.unique",
    key: "Frostburn",
    base_code: "hgl",
    name: "Frostburn",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 14,
        max: 28
    }, {
        key: "mana%",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "dmg-cold",
        param_id: 4,
        param: 50,
        min: 6,
        max: 22
    }, {
        key: "ac%",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "pierce-cold",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "pierce-fire",
        param_id: 7,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invhgl",
        invtransform: "dred"
    },
    base: "Gauntlets"
}, {
    id: 107,
    kind: "item.unique",
    key: "Hotspur",
    base_code: "lbt",
    name: "Hotspur",
    level: 7,
    modifiers: [{
        key: "res-fire-max",
        param_id: 1,
        min: 4,
        max: 6
    }, {
        key: "hp",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 3,
        max: 6
    }, {
        key: "ac",
        param_id: 4,
        min: 6,
        max: 6
    }, {
        key: "res-fire",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "ac%",
        param_id: 6,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invlbt",
        invtransform: "cred"
    },
    base: "Boots"
}, {
    id: 108,
    kind: "item.unique",
    key: "Gorefoot",
    base_code: "vbt",
    name: "Gorefoot",
    level: 12,
    modifiers: [{
        key: "bloody",
        param_id: 1,
        min: 3,
        max: 5
    }, {
        key: "move2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "manasteal",
        param_id: 3,
        min: 2,
        max: 4
    }, {
        key: "leapspeed",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "ac%",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "skill",
        param_id: 6,
        param: 132,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invvbt",
        invtransform: "dblu"
    },
    base: "Heavy Boots"
}, {
    id: 109,
    kind: "item.unique",
    key: "Treads of Cthon",
    base_code: "mbt",
    name: "Treads of Cthon",
    level: 20,
    modifiers: [{
        key: "move2",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "ac-miss",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "stamdrain",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "hp",
        param_id: 4,
        min: 10,
        max: 30
    }, {
        key: "ac",
        param_id: 5,
        min: 12,
        max: 12
    }, {
        key: "ac%",
        param_id: 6,
        min: 30,
        max: 40
    }, {
        key: "pierce",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invmbt",
        invtransform: "lgrn"
    },
    base: "Chain Boots"
}, {
    id: 110,
    kind: "item.unique",
    key: "Goblin Toe",
    base_code: "tbt",
    name: "Goblin Toe",
    level: 30,
    modifiers: [{
        key: "crush",
        param_id: 1,
        min: 15,
        max: 25
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "red-mag",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "ac",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "move2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 6,
        min: 50,
        max: 60
    }, {
        key: "dmg%",
        param_id: 7,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 22
    },
    image: {
        invfile: "invtbt",
        invtransform: "dgry"
    },
    base: "Light Plated Boots"
}, {
    id: 111,
    kind: "item.unique",
    key: "Tearhaunch",
    base_code: "hbt",
    name: "Tearhaunch",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "str",
        param_id: 2,
        min: 5,
        max: 10
    }, {
        key: "dex",
        param_id: 3,
        min: 5,
        max: 10
    }, {
        key: "move2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "res-all",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 60,
        max: 80
    }, {
        key: "skill",
        param_id: 7,
        param: 115,
        min: 1,
        max: 2
    }, {
        key: "skilltab",
        param_id: 8,
        param: 11,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invhbt",
        invtransform: "dgrn"
    },
    base: "Greaves"
}, {
    id: 112,
    kind: "item.unique",
    key: "Lenyms Cord",
    base_code: "lbl",
    name: "Lenymo",
    level: 10,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "res-all",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "light",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "cast2",
        param_id: 5,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 7
    },
    image: {
        invfile: "invlbl",
        invtransform: "cgrn"
    },
    base: "Sash"
}, {
    id: 113,
    kind: "item.unique",
    key: "Snakecord",
    base_code: "vbl",
    name: "Snakecord",
    level: 16,
    modifiers: [{
        key: "extra-pois",
        param_id: 1,
        min: 4,
        max: 6
    }, {
        key: "res-pois",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "regen",
        param_id: 5,
        min: 5,
        max: 15
    }, {
        key: "res-pois-len",
        param_id: 6,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invvbl",
        invtransform: "blac"
    },
    base: "Light Belt"
}, {
    id: 114,
    kind: "item.unique",
    key: "Nightsmoke",
    base_code: "mbl",
    name: "Nightsmoke",
    level: 27,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-to-mana",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "mana",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "red-dmg",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "ac",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "ac%",
        param_id: 6,
        min: 30,
        max: 50
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invmbl",
        invtransform: "lyel"
    },
    base: "Belt"
}, {
    id: 115,
    kind: "item.unique",
    key: "Goldwrap",
    base_code: "tbl",
    name: "Goldwrap",
    level: 36,
    modifiers: [{
        key: "mag%",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "light",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "ac",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 40,
        max: 60
    }, {
        key: "gold%",
        param_id: 6,
        min: 50,
        max: 80
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invtbl",
        invtransform: "lblu"
    },
    base: "Heavy Belt"
}, {
    id: 116,
    kind: "item.unique",
    key: "Bladebuckle",
    base_code: "hbl",
    name: "Bladebuckle",
    level: 39,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 420,
        max: 480
    }, {
        key: "ac",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 4,
        max: 7
    }, {
        key: "str",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "dex",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 80,
        max: 100
    }, {
        key: "balance2",
        param_id: 7,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invhbl",
        invtransform: "dyel"
    },
    base: "Plated Belt"
}, {
    id: 117,
    kind: "item.unique",
    key: "Nokozan Relic",
    base_code: "amu",
    name: "Nokozan Relic",
    level: 14,
    modifiers: [{
        key: "fire-min",
        param_id: 1,
        min: 3,
        max: 6
    }, {
        key: "fire-max",
        param_id: 2,
        min: 7,
        max: 12
    }, {
        key: "res-fire-max",
        param_id: 3,
        min: 4,
        max: 8
    }, {
        key: "res-fire",
        param_id: 4,
        min: 20,
        max: 35
    }, {
        key: "light",
        param_id: 5,
        min: 3,
        max: 3
    }, {
        key: "balance2",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 10
    },
    image: {
        invfile: "invamu",
        invtransform: ""
    },
    base: "Amulet"
}, {
    id: 118,
    kind: "item.unique",
    key: "The Eye of Etlich",
    base_code: "amu",
    name: "The Eye of Etlich",
    level: 20,
    modifiers: [{
        key: "ac-miss",
        param_id: 1,
        min: 10,
        max: 40
    }, {
        key: "light",
        param_id: 2,
        min: 1,
        max: 5
    }, {
        key: "allskills",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 3,
        max: 7
    }, {
        key: "cold-min",
        param_id: 5,
        min: 4,
        max: 6
    }, {
        key: "cold-max",
        param_id: 6,
        min: 12,
        max: 20
    }, {
        key: "cold-len",
        param_id: 7,
        min: 50,
        max: 250
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invamu",
        invtransform: ""
    },
    base: "Amulet"
}, {
    id: 119,
    kind: "item.unique",
    key: "The Mahim-Oak Curio",
    base_code: "amu",
    name: "The Mahim-Oak Curio",
    level: 34,
    modifiers: [{
        key: "all-stats",
        param_id: 1,
        min: 5,
        max: 10
    }, {
        key: "ac",
        param_id: 2,
        min: 5,
        max: 10
    }, {
        key: "att%",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "res-all",
        param_id: 4,
        min: 5,
        max: 10
    }, {
        key: "ac%",
        param_id: 5,
        min: 5,
        max: 10
    }, {
        key: "cast2",
        param_id: 6,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invamu",
        invtransform: ""
    },
    base: "Amulet"
}, {
    id: 120,
    kind: "item.unique",
    key: "Nagelring",
    base_code: "rin",
    name: "Nagelring",
    level: 10,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "thorns",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "att",
        param_id: 3,
        min: 50,
        max: 75
    }, {
        key: "mag%",
        param_id: 4,
        min: 15,
        max: 40
    }, {
        key: "mana-kill",
        param_id: 5,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 7
    },
    image: {
        invfile: "invrin",
        invtransform: ""
    },
    base: "Ring"
}, {
    id: 121,
    kind: "item.unique",
    key: "Manald Heal",
    base_code: "rin",
    name: "Manald Heal",
    level: 20,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 4,
        max: 7
    }, {
        key: "regen",
        param_id: 2,
        min: 5,
        max: 8
    }, {
        key: "hp",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 4,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invrin",
        invtransform: ""
    },
    base: "Ring"
}, {
    id: 122,
    kind: "item.unique",
    key: "The Stone of Jordan",
    base_code: "rin",
    name: "The Stone of Jordan",
    level: 39,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "mana%",
        param_id: 2,
        min: 15,
        max: 20
    }, {
        key: "dmg-ltng",
        param_id: 3,
        min: 1,
        max: 120
    }, {
        key: "allskills",
        param_id: 4,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invrin",
        invtransform: ""
    },
    base: "Ring"
}, {
    id: 123,
    kind: "item.unique",
    key: "Amulet of the Viper",
    base_code: "vip",
    name: "Amulet of the Viper",
    level: 0,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "res-pois",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "hp",
        param_id: 3,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invvip",
        invtransform: ""
    },
    base: "Top of the Horadric Staff"
}, {
    id: 124,
    kind: "item.unique",
    key: "Staff of Kings",
    base_code: "msf",
    name: "Staff of Kings",
    level: 0,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invmsf",
        invtransform: ""
    },
    base: "Shaft of the Horadric Staff"
}, {
    id: 125,
    kind: "item.unique",
    key: "Horadric Staff",
    base_code: "hst",
    name: "Horadric Staff",
    level: 0,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "res-pois",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "hp",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invhst",
        invtransform: ""
    },
    base: "Horadric Staff"
}, {
    id: 126,
    kind: "item.unique",
    key: "Hell Forge Hammer",
    base_code: "hfh",
    name: "Hell Forge Hammer",
    level: 0,
    modifiers: [{
        key: "fire-min",
        param_id: 1,
        min: 5,
        max: 5
    }, {
        key: "fire-max",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-fire",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "ac",
        param_id: 4,
        min: 35,
        max: 35
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invhfh",
        invtransform: ""
    },
    base: "Hell Forge Hammer"
}, {
    id: 127,
    kind: "item.unique",
    key: "KhalimFlail",
    base_code: "qf1",
    name: "Khalim's Flail",
    level: 0,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "swing3",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invqf1",
        invtransform: ""
    },
    base: "Khalim's Flail"
}, {
    id: 128,
    kind: "item.unique",
    key: "SuperKhalimFlail",
    base_code: "qf2",
    name: "Khalim's Will",
    level: 0,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "swing3",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "manasteal",
        param_id: 5,
        min: 6,
        max: 6
    }, {
        key: "lifesteal",
        param_id: 6,
        min: 6,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 0
    },
    image: {
        invfile: "invqf2",
        invtransform: ""
    },
    base: "Khalim's Will"
}, {
    id: 129,
    kind: "item.unique",
    key: "Expansion",
    base_code: "",
    name: "Expansion",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 130,
    kind: "item.unique",
    key: "Coldkill",
    base_code: "9ha",
    name: "Coldkill",
    level: 44,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 50,
        min: 160,
        max: 240
    }, {
        key: "res-cold",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "res-cold-max",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 45,
        min: 14,
        max: 18
    }, {
        key: "gethit-skill",
        param_id: 6,
        param: 44,
        min: 25,
        max: 20
    }, {
        key: "dmg%",
        param_id: 7,
        min: 150,
        max: 190
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invhaxu",
        invtransform: "cblu"
    },
    base: "Hatchet"
}, {
    id: 131,
    kind: "item.unique",
    key: "Butcher's Pupil",
    base_code: "9ax",
    name: "Butcher's Pupil",
    level: 47,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "openwounds",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 3,
        min: 150,
        max: 200
    }, {
        key: "Deep-Wounds",
        param_id: 4,
        min: 90,
        max: 120
    }, {
        key: "swing3",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "dmg-norm",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invaxeu",
        invtransform: "cblu"
    },
    base: "Cleaver"
}, {
    id: 132,
    kind: "item.unique",
    key: "Islestrike",
    base_code: "92a",
    name: "Islestrike",
    level: 51,
    modifiers: [{
        key: "dru",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dex",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "vit",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "enr",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "crush",
        param_id: 7,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 8,
        min: 170,
        max: 190
    }, {
        key: "skill",
        param_id: 9,
        param: 233,
        min: 3,
        max: 4
    }, {
        key: "skill",
        param_id: 10,
        param: 248,
        min: 3,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "inv2ax",
        invtransform: ""
    },
    base: "Twin Axe"
}, {
    id: 133,
    kind: "item.unique",
    key: "Pompe's Wrath",
    base_code: "9mp",
    name: "Pompeii's Wrath",
    level: 53,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 229,
        min: 8,
        max: 28
    }, {
        key: "slow",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 60,
        max: 175
    }, {
        key: "dmg%",
        param_id: 4,
        min: 170,
        max: 200
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invmpiu",
        invtransform: "cred"
    },
    base: "Crowbill"
}, {
    id: 134,
    kind: "item.unique",
    key: "Guardian Naga",
    base_code: "9wa",
    name: "Guardian Naga",
    level: 56,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 92,
        min: 10,
        max: 25
    }, {
        key: "thorns",
        param_id: 2,
        min: 75,
        max: 150
    }, {
        key: "res-pois",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 4,
        min: 150,
        max: 180
    }, {
        key: "dmg-pois",
        param_id: 5,
        param: 50,
        min: 1280,
        max: 1280
    }, {
        key: "dmg-max",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 48
    },
    image: {
        invfile: "invwax",
        invtransform: ""
    },
    base: "Naga"
}, {
    id: 135,
    kind: "item.unique",
    key: "Warlord's Trust",
    base_code: "9la",
    name: "Warlord's Trust",
    level: 43,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "regen",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "vit/lvl",
        param_id: 3,
        param: 4
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "rep-dur",
        param_id: 5,
        param: 25
    }, {
        key: "dmg%",
        param_id: 6,
        min: 175,
        max: 255
    }, {
        key: "swing2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "red-dmg%",
        param_id: 8,
        min: 10,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invlax",
        invtransform: "whit"
    },
    base: "Military Axe"
}, {
    id: 136,
    kind: "item.unique",
    key: "Spellsteel",
    base_code: "9ba",
    name: "Spellsteel",
    level: 47,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -60,
        max: -60
    }, {
        key: "mana",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "red-mag",
        param_id: 3,
        min: 12,
        max: 15
    }, {
        key: "cast1",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "dmg%",
        param_id: 5,
        min: 165,
        max: 245
    }, {
        key: "regen-mana",
        param_id: 6,
        min: 25,
        max: 25
    }, {
        key: "charged",
        param_id: 7,
        param: 357,
        min: 60,
        max: 1
    }, {
        key: "charged",
        param_id: 8,
        param: 442,
        min: 60,
        max: 18
    }, {
        key: "hit-skill",
        param_id: 9,
        param: 101,
        min: 30,
        max: 25
    }, {
        key: "hit-skill",
        param_id: 10,
        param: 225,
        min: 30,
        max: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invbrx",
        invtransform: "whit"
    },
    base: "Bearded Axe"
}, {
    id: 137,
    kind: "item.unique",
    key: "Stormrider",
    base_code: "9bt",
    name: "Stormrider",
    level: 49,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 53,
        min: 14,
        max: 25
    }, {
        key: "hit-skill",
        param_id: 2,
        param: 38,
        min: 30,
        max: 27
    }, {
        key: "dmg-ltng",
        param_id: 3,
        min: 1,
        max: 200
    }, {
        key: "dmg-norm",
        param_id: 4,
        min: 35,
        max: 75
    }, {
        key: "dmg%",
        param_id: 5,
        min: 100,
        max: 100
    }, {
        key: "dur",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "light-thorns",
        param_id: 7,
        min: 75,
        max: 150
    }, {
        key: "gethit-skill",
        param_id: 8,
        param: 38,
        min: 25,
        max: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "inv9btu",
        invtransform: "lred"
    },
    base: "Tabar"
}, {
    id: 138,
    kind: "item.unique",
    key: "Boneslayer Blade",
    base_code: "9ga",
    name: "Boneslayer Blade",
    level: 50,
    modifiers: [{
        key: "att-und/lvl",
        param_id: 1,
        param: 10
    }, {
        key: "dmg-und/lvl",
        param_id: 2,
        param: 20
    }, {
        key: "str",
        param_id: 3,
        min: 8,
        max: 8
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "att%",
        param_id: 5,
        min: 35,
        max: 35
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 220
    }, {
        key: "oskill",
        param_id: 7,
        param: 106,
        min: 10,
        max: 12
    }, {
        key: "hit-skill",
        param_id: 8,
        param: 101,
        min: 20,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invgaxu",
        invtransform: ""
    },
    base: "Gothic Axe"
}, {
    id: 139,
    kind: "item.unique",
    key: "The Minataur",
    base_code: "9gi",
    name: "The Minotaur",
    level: 53,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "str",
        param_id: 3,
        min: 15,
        max: 20
    }, {
        key: "slow",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "crush",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "dmg-norm",
        param_id: 6,
        min: 40,
        max: 50
    }, {
        key: "dmg%",
        param_id: 7,
        min: 200,
        max: 260
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "inv9giu",
        invtransform: ""
    },
    base: "Ancient Axe"
}, {
    id: 140,
    kind: "item.unique",
    key: "Suicide Branch",
    base_code: "9wn",
    name: "Suicide Branch",
    level: 41,
    modifiers: [{
        key: "skill",
        param_id: 1,
        param: 367,
        min: 2,
        max: 3
    }, {
        key: "cast2",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "res-all",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "mana%",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "hp",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "allskills",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "blood-warp-life-reduction",
        param_id: 7,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 33
    },
    image: {
        invfile: "invwnd",
        invtransform: ""
    },
    base: "Burnt Wand"
}, {
    id: 141,
    kind: "item.unique",
    key: "Carin Shard",
    base_code: "9yw",
    name: "Carin Shard",
    level: 43,
    modifiers: [{
        key: "hp/lvl",
        param_id: 1,
        param: 10
    }, {
        key: "cast2",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "mana/lvl",
        param_id: 3,
        param: 10
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "regen",
        param_id: 5,
        min: 15,
        max: 25
    }, {
        key: "nec",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "skilltab",
        param_id: 7,
        param: 8,
        min: 1,
        max: 2
    }, {
        key: "skill",
        param_id: 8,
        param: 75,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invywn",
        invtransform: "cblu"
    },
    base: "Petrified Wand"
}, {
    id: 142,
    kind: "item.unique",
    key: "Arm of King Leoric",
    base_code: "9bw",
    name: "Arm of King Leoric",
    level: 44,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "mana/lvl",
        param_id: 2,
        param: 10
    }, {
        key: "regen",
        param_id: 3,
        min: 14,
        max: 32
    }, {
        key: "cast1",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "extra-skele-war",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 6,
        param: 80,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 69,
        min: 3,
        max: 4
    }, {
        key: "skill",
        param_id: 8,
        param: 70,
        min: 3,
        max: 4
    }, {
        key: "skill",
        param_id: 9,
        param: 89,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invbwnu",
        invtransform: ""
    },
    base: "Tomb Wand"
}, {
    id: 143,
    kind: "item.unique",
    key: "Blackhand Key",
    base_code: "9gw",
    name: "Blackhand Key",
    level: 49,
    modifiers: [{
        key: "skilltab",
        param_id: 1,
        param: 6,
        min: 2,
        max: 3
    }, {
        key: "dmg-to-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "hp",
        param_id: 3,
        min: 30,
        max: 60
    }, {
        key: "heal-kill",
        param_id: 4,
        min: 4,
        max: 7
    }, {
        key: "cast3",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "res-fire",
        param_id: 6,
        min: 37,
        max: 37
    }, {
        key: "nec",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "charged",
        param_id: 8,
        param: 150,
        min: 30,
        max: 7
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "inv9gwu",
        invtransform: "blac"
    },
    base: "Grave Wand"
}, {
    id: 144,
    kind: "item.unique",
    key: "Dark Clan Crusher",
    base_code: "9cl",
    name: "Dark Clan Crusher",
    level: 42,
    modifiers: [{
        key: "dru",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "dmg-demon",
        param_id: 2,
        min: 200,
        max: 200
    }, {
        key: "att-demon",
        param_id: 3,
        min: 200,
        max: 200
    }, {
        key: "dmg%",
        param_id: 4,
        min: 180,
        max: 240
    }, {
        key: "att%",
        param_id: 5,
        min: 20,
        max: 25
    }, {
        key: "demon-heal",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "swing2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 34
    },
    image: {
        invfile: "invclbu",
        invtransform: "dgld"
    },
    base: "Cudgel"
}, {
    id: 145,
    kind: "item.unique",
    key: "Zakarum's Hand",
    base_code: "9sc",
    name: "Zakarum's Hand",
    level: 45,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 8,
        max: 8
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "regen-mana",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "regen-stam",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 59,
        min: 10,
        max: 20
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 220
    }, {
        key: "swing2",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "skilltab",
        param_id: 8,
        param: 10,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 37
    },
    image: {
        invfile: "invscp",
        invtransform: "lpur"
    },
    base: "Rune Scepter"
}, {
    id: 146,
    kind: "item.unique",
    key: "The Fetid Sprinkler",
    base_code: "9qs",
    name: "The Fetid Sprinkler",
    level: 46,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 15,
        max: 10
    }, {
        key: "gethit-skill",
        param_id: 3,
        param: 81,
        min: 10,
        max: 10
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 100,
        min: 409,
        max: 409
    }, {
        key: "dmg%",
        param_id: 5,
        min: 160,
        max: 220
    }, {
        key: "att",
        param_id: 6,
        min: 150,
        max: 200
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 15,
        max: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invgsc",
        invtransform: ""
    },
    base: "Holy Water Sprinkler"
}, {
    id: 147,
    kind: "item.unique",
    key: "Hand of Blessed Light",
    base_code: "9ws",
    name: "Hand of Blessed Light",
    level: 50,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 2,
        min: 130,
        max: 160
    }, {
        key: "att%",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "skill",
        param_id: 4,
        param: 371,
        min: 2,
        max: 4
    }, {
        key: "regen-mana",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "light",
        param_id: 6,
        min: 4,
        max: 4
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 20,
        max: 45
    }, {
        key: "skill",
        param_id: 8,
        param: 101,
        min: 2,
        max: 4
    }, {
        key: "skill",
        param_id: 9,
        param: 121,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 10,
        param: 364,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invwsp",
        invtransform: ""
    },
    base: "Divine Scepter"
}, {
    id: 148,
    kind: "item.unique",
    key: "Fleshrender",
    base_code: "9sp",
    name: "Fleshrender",
    level: 46,
    modifiers: [{
        key: "openwounds",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "swing2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "crush",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "Deep-Wounds",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 35,
        max: 50
    }, {
        key: "dmg%",
        param_id: 6,
        min: 130,
        max: 180
    }, {
        key: "dru",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "skilltab",
        param_id: 8,
        param: 16,
        min: 2,
        max: 2
    }, {
        key: "dur",
        param_id: 9,
        min: 20,
        max: 20
    }, {
        key: "deadly",
        param_id: 10,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invspcu",
        invtransform: ""
    },
    base: "Barbed Club"
}, {
    id: 149,
    kind: "item.unique",
    key: "Sureshrill Frost",
    base_code: "9ma",
    name: "Sureshrill Frost",
    level: 47,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 125,
        min: 63,
        max: 112
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dmg%",
        param_id: 3,
        min: 150,
        max: 180
    }, {
        key: "dmg-norm",
        param_id: 4,
        min: 15,
        max: 30
    }, {
        key: "freeze",
        param_id: 5,
        min: 3,
        max: 3
    }, {
        key: "hit-skill",
        param_id: 6,
        param: 64,
        min: 10,
        max: 14
    }, {
        key: "coldskill",
        param_id: 7,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invmac",
        invtransform: ""
    },
    base: "Flanged Mace"
}, {
    id: 150,
    kind: "item.unique",
    key: "Moonfall",
    base_code: "9mt",
    name: "Moonfall",
    level: 50,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 56,
        min: 12,
        max: 26
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 55,
        max: 115
    }, {
        key: "red-mag",
        param_id: 3,
        min: 9,
        max: 12
    }, {
        key: "dmg%",
        param_id: 4,
        min: 140,
        max: 170
    }, {
        key: "light",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "magskill",
        param_id: 6,
        min: 2,
        max: 3
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 10,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invmstu",
        invtransform: ""
    },
    base: "Jagged Star"
}, {
    id: 151,
    kind: "item.unique",
    key: "Baezil's Vortex",
    base_code: "9fl",
    name: "Baezil's Vortex",
    level: 53,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 48,
        min: 20,
        max: 25
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 150
    }, {
        key: "mana",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 5,
        min: 160,
        max: 200
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "charged",
        param_id: 7,
        param: 48,
        min: 80,
        max: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invfla",
        invtransform: "dblu"
    },
    base: "Knout"
}, {
    id: 152,
    kind: "item.unique",
    key: "Earthshaker",
    base_code: "9wh",
    name: "Earthshaker",
    level: 51,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 234,
        min: 14,
        max: 24
    }, {
        key: "swing3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 3,
        min: 180,
        max: 230
    }, {
        key: "stupidity",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "skilltab",
        param_id: 5,
        param: 17,
        min: 2,
        max: 4
    }, {
        key: "dur",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "cast2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invwhm",
        invtransform: ""
    },
    base: "Battle Hammer"
}, {
    id: 153,
    kind: "item.unique",
    key: "Bloodtree Stump",
    base_code: "9m9",
    name: "Bloodtree Stump",
    level: 56,
    modifiers: [{
        key: "crush",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dmg%",
        param_id: 2,
        min: 210,
        max: 260
    }, {
        key: "res-all",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "str",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "skilltab",
        param_id: 5,
        param: 13,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 6,
        param: 128,
        min: 3,
        max: 3
    }, {
        key: "dur",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "skill",
        param_id: 8,
        param: 143,
        min: 3,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 48
    },
    image: {
        invfile: "invmau",
        invtransform: ""
    },
    base: "War Club"
}, {
    id: 154,
    kind: "item.unique",
    key: "The Gavel of Pain",
    base_code: "9gm",
    name: "The Gavel of Pain",
    level: 53,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 442,
        min: 12,
        max: 31
    }, {
        key: "gethit-skill",
        param_id: 2,
        param: 444,
        min: 5,
        max: 1
    }, {
        key: "thorns",
        param_id: 3,
        min: 260,
        max: 260
    }, {
        key: "rep-charge",
        param_id: 4,
        param: 16
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 12,
        max: 30
    }, {
        key: "dmg%",
        param_id: 6,
        min: 215,
        max: 245
    }, {
        key: "charged",
        param_id: 7,
        param: 442,
        min: 3,
        max: 8
    }, {
        key: "curse-effectiveness",
        param_id: 8,
        min: 10,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "inv9gmu",
        invtransform: ""
    },
    base: "Martel de Fer"
}, {
    id: 155,
    kind: "item.unique",
    key: "Bloodletter",
    base_code: "9ss",
    name: "Bloodletter",
    level: 38,
    modifiers: [{
        key: "dmg-norm",
        param_id: 1,
        min: 12,
        max: 45
    }, {
        key: "att",
        param_id: 2,
        min: 90,
        max: 90
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 8,
        max: 8
    }, {
        key: "stamdrain",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "swing2",
        param_id: 5,
        min: -40,
        max: -40
    }, {
        key: "dmg%",
        param_id: 6,
        min: 280,
        max: 340
    }, {
        key: "skill",
        param_id: 7,
        param: 128,
        min: 2,
        max: 4
    }, {
        key: "skill",
        param_id: 8,
        param: 151,
        min: 2,
        max: 3
    }, {
        key: "dur",
        param_id: 9,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 30
    },
    image: {
        invfile: "invssd",
        invtransform: "cred"
    },
    base: "Gladius"
}, {
    id: 156,
    kind: "item.unique",
    key: "Coldsteel Eye",
    base_code: "9sm",
    name: "Coldsteel Eye",
    level: 39,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "freeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "deadly",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "dur",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "dmg%",
        param_id: 5,
        min: 225,
        max: 275
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "manasteal",
        param_id: 7,
        min: 6,
        max: 6
    }, {
        key: "dmg-cold",
        param_id: 8,
        param: 50,
        min: 50,
        max: 80
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invscmu",
        invtransform: ""
    },
    base: "Cutlass"
}, {
    id: 157,
    kind: "item.unique",
    key: "Hexfire",
    base_code: "9sb",
    name: "Hexfire",
    level: 41,
    modifiers: [{
        key: "cast2",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "res-fire",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "res-fire-max",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 35,
        max: 40
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 200
    }, {
        key: "fireskill",
        param_id: 7,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 33
    },
    image: {
        invfile: "invsbru",
        invtransform: ""
    },
    base: "Shamshir"
}, {
    id: 158,
    kind: "item.unique",
    key: "Blade of Ali Baba",
    base_code: "9fc",
    name: "Blade of Ali Baba",
    level: 43,
    modifiers: [{
        key: "sock",
        param_id: 1,
        min: 2,
        max: 3
    }, {
        key: "gold%/lvl",
        param_id: 2,
        param: 20
    }, {
        key: "mag%/lvl",
        param_id: 3,
        param: 8
    }, {
        key: "mana",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 120
    }, {
        key: "dex",
        param_id: 6,
        min: 5,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invflc",
        invtransform: "cred"
    },
    base: "Tulwar"
}, {
    id: 159,
    kind: "item.unique",
    key: "Ginther's Rift",
    base_code: "9cr",
    name: "Ginther's Rift",
    level: 45,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 7,
        max: 12
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "rep-dur",
        param_id: 3,
        param: 20
    }, {
        key: "dur",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dmg-mag",
        param_id: 5,
        min: 75,
        max: 180
    }, {
        key: "dmg%",
        param_id: 6,
        min: 150,
        max: 250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 37
    },
    image: {
        invfile: "inv9cru",
        invtransform: ""
    },
    base: "Dimensional Blade"
}, {
    id: 160,
    kind: "item.unique",
    key: "Headstriker",
    base_code: "9bs",
    name: "Headstriker",
    level: 47,
    modifiers: [{
        key: "noheal",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "str",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "deadly/lvl",
        param_id: 3,
        param: 6
    }, {
        key: "dmg/lvl",
        param_id: 4,
        param: 8
    }, {
        key: "dmg%",
        param_id: 5,
        min: 150,
        max: 200
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "max-deadly",
        param_id: 7,
        min: 10,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invbsd",
        invtransform: "bwht"
    },
    base: "Battle Sword"
}, {
    id: 161,
    kind: "item.unique",
    key: "Plague Bearer",
    base_code: "9ls",
    name: "Plague Bearer",
    level: 49,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 92,
        min: 5,
        max: 14
    }, {
        key: "dmg-pois",
        param_id: 2,
        param: 75,
        min: 1024,
        max: 1024
    }, {
        key: "dmg-norm",
        param_id: 3,
        min: 10,
        max: 45
    }, {
        key: "dmg%",
        param_id: 4,
        min: 150,
        max: 250
    }, {
        key: "res-pois",
        param_id: 5,
        min: 45,
        max: 45
    }, {
        key: "skill",
        param_id: 6,
        param: 238,
        min: 3,
        max: 5
    }, {
        key: "swing1",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "inv9lsu",
        invtransform: ""
    },
    base: "Rune Sword"
}, {
    id: 162,
    kind: "item.unique",
    key: "The Atlantian",
    base_code: "9wd",
    name: "The Atlantean",
    level: 50,
    modifiers: [{
        key: "dur",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "ac",
        param_id: 2,
        min: 75,
        max: 75
    }, {
        key: "str",
        param_id: 3,
        min: 16,
        max: 16
    }, {
        key: "dex",
        param_id: 4,
        min: 12,
        max: 12
    }, {
        key: "vit",
        param_id: 5,
        min: 8,
        max: 8
    }, {
        key: "dmg%",
        param_id: 6,
        min: 230,
        max: 280
    }, {
        key: "pal",
        param_id: 7,
        min: 2,
        max: 2
    }, {
        key: "att%",
        param_id: 8,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invwsd",
        invtransform: "lblu"
    },
    base: "Ancient Sword"
}, {
    id: 163,
    kind: "item.unique",
    key: "Crainte Vomir",
    base_code: "92h",
    name: "Crainte Vomir",
    level: 50,
    modifiers: [{
        key: "slow",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "dmg-ac",
        param_id: 2,
        min: -70,
        max: -70
    }, {
        key: "move2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "red-dmg%",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 250,
        max: 290
    }, {
        key: "swing3",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "inv2hsu",
        invtransform: ""
    },
    base: "Espandon"
}, {
    id: 164,
    kind: "item.unique",
    key: "Bing Sz Wang",
    base_code: "9cm",
    name: "Bing Sz Wang",
    level: 51,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -30,
        max: -30
    }, {
        key: "dmg-cold",
        param_id: 2,
        param: 75,
        min: 200,
        max: 350
    }, {
        key: "str",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "freeze",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 64,
        min: 33,
        max: 15
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 230
    }, {
        key: "pierce-cold",
        param_id: 7,
        min: 10,
        max: 20
    }, {
        key: "swing2",
        param_id: 8,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invclm",
        invtransform: ""
    },
    base: "Dacian Falx"
}, {
    id: 165,
    kind: "item.unique",
    key: "The Vile Husk",
    base_code: "9gs",
    name: "The Vile Husk",
    level: 52,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 442,
        min: 18,
        max: 31
    }, {
        key: "dmg-und/lvl",
        param_id: 2,
        param: 30
    }, {
        key: "res-pois",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 50,
        min: 1280,
        max: 1280
    }, {
        key: "dmg%",
        param_id: 5,
        min: 175,
        max: 225
    }, {
        key: "att-und/lvl",
        param_id: 6,
        param: 20
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invgisu",
        invtransform: "dgry"
    },
    base: "Tusk Sword"
}, {
    id: 166,
    kind: "item.unique",
    key: "Cloudcrack",
    base_code: "9b9",
    name: "Cloudcrack",
    level: 53,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 121,
        min: 40,
        max: 21
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 480
    }, {
        key: "ac",
        param_id: 3,
        min: 120,
        max: 120
    }, {
        key: "light",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "res-ltng-max",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 6,
        min: 180,
        max: 230
    }, {
        key: "light-thorns",
        param_id: 7,
        min: 100,
        max: 150
    }, {
        key: "skilltab",
        param_id: 8,
        param: 10,
        min: 5,
        max: 6
    }, {
        key: "skilltab",
        param_id: 9,
        param: 11,
        min: 5,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invbswu",
        invtransform: ""
    },
    base: "Gothic Sword"
}, {
    id: 167,
    kind: "item.unique",
    key: "Todesfaelle Flamme",
    base_code: "9fb",
    name: "Todesfaelle Flamme",
    level: 54,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 50,
        max: 200
    }, {
        key: "aura",
        param_id: 2,
        min: 6,
        max: 6
    }, {
        key: "abs-fire",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "att-skill",
        param_id: 4,
        min: 15,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 180,
        max: 220
    }, {
        key: "charged",
        param_id: 6,
        param: 52,
        min: 45,
        max: 10
    }, {
        key: "att-skill",
        param_id: 7,
        param: 51,
        min: 2,
        max: 20
    }, {
        key: "att-skill",
        param_id: 8,
        min: 4,
        max: 16
    }, {
        key: "swing2",
        param_id: 9,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 46
    },
    image: {
        invfile: "inv9fbu",
        invtransform: ""
    },
    base: "Zweihander"
}, {
    id: 168,
    kind: "item.unique",
    key: "Swordguard",
    base_code: "9gd",
    name: "Swordguard",
    level: 55,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -50,
        max: -50
    }, {
        key: "ac/lvl",
        param_id: 2,
        param: 40
    }, {
        key: "res-all",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "ac-miss",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dmg-to-mana",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 6,
        min: 240,
        max: 280
    }, {
        key: "ac-hth",
        param_id: 7,
        min: 200,
        max: 200
    }, {
        key: "balance2",
        param_id: 8,
        min: 40,
        max: 40
    }, {
        key: "block",
        param_id: 9,
        min: 40,
        max: 40
    }, {
        key: "block2",
        param_id: 10,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 48
    },
    image: {
        invfile: "invgsdu",
        invtransform: "bwht"
    },
    base: "Executioner Sword"
}, {
    id: 169,
    kind: "item.unique",
    key: "Spineripper",
    base_code: "9dg",
    name: "Spineripper",
    level: 40,
    modifiers: [{
        key: "ignore-ac",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 8,
        max: 8
    }, {
        key: "noheal",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "swing3",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "dex",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 6,
        min: 200,
        max: 240
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 15,
        max: 27
    }, {
        key: "allskills",
        param_id: 8,
        min: 1,
        max: 1
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "invdgr",
        invtransform: ""
    },
    base: "Poignard"
}, {
    id: 170,
    kind: "item.unique",
    key: "Heart Carver",
    base_code: "9di",
    name: "Heart Carver",
    level: 44,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dmg-norm",
        param_id: 3,
        min: 15,
        max: 35
    }, {
        key: "dmg%",
        param_id: 4,
        min: 190,
        max: 240
    }, {
        key: "skill",
        param_id: 5,
        param: 131,
        min: 5,
        max: 7
    }, {
        key: "skill",
        param_id: 6,
        param: 142,
        min: 5,
        max: 7
    }, {
        key: "skill",
        param_id: 7,
        param: 150,
        min: 5,
        max: 7
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invdir",
        invtransform: ""
    },
    base: "Rondel"
}, {
    id: 171,
    kind: "item.unique",
    key: "Blackbog's Sharp",
    base_code: "9kr",
    name: "Blackbog's Sharp",
    level: 46,
    modifiers: [{
        key: "slow",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "ac",
        param_id: 2,
        min: 50,
        max: 150
    }, {
        key: "dmg-norm",
        param_id: 3,
        min: 15,
        max: 45
    }, {
        key: "swing3",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "dmg-pois",
        param_id: 5,
        param: 50,
        min: 512,
        max: 512
    }, {
        key: "skill",
        param_id: 6,
        param: 73,
        min: 2,
        max: 2
    }, {
        key: "poisskill",
        param_id: 7,
        min: 2,
        max: 4
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invkrsu",
        invtransform: ""
    },
    base: "Cinquedeas"
}, {
    id: 172,
    kind: "item.unique",
    key: "Stormspike",
    base_code: "9bl",
    name: "Stormspike",
    level: 49,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 360,
        max: 360
    }, {
        key: "light-thorns",
        param_id: 3,
        min: 60,
        max: 120
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 38,
        min: 75,
        max: 23
    }, {
        key: "dmg%",
        param_id: 5,
        min: 175,
        max: 250
    }, {
        key: "pierce-ltng",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "extra-ltng",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "inv9blu",
        invtransform: "cblu"
    },
    base: "Stiletto"
}, {
    id: 173,
    kind: "item.unique",
    key: "The Impaler",
    base_code: "9sr",
    name: "The Impaler",
    level: 39,
    modifiers: [{
        key: "ignore-ac",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "att",
        param_id: 2,
        min: 150,
        max: 150
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "openwounds",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "Deep-Wounds",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 6,
        min: 140,
        max: 200
    }, {
        key: "oskill",
        param_id: 7,
        param: 19,
        min: 4,
        max: 6
    }, {
        key: "oskill",
        param_id: 8,
        param: 30,
        min: 3,
        max: 4
    }, {
        key: "oskill",
        param_id: 9,
        param: 10,
        min: 4,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invspr",
        invtransform: "lred"
    },
    base: "War Spear"
}, {
    id: 174,
    kind: "item.unique",
    key: "Kelpie Snare",
    base_code: "9tr",
    name: "Kelpie Snare",
    level: 41,
    modifiers: [{
        key: "slow",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "res-fire",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "hp/lvl",
        param_id: 3,
        param: 10
    }, {
        key: "dmg-norm",
        param_id: 4,
        min: 30,
        max: 50
    }, {
        key: "str",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 6,
        min: 140,
        max: 180
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 33
    },
    image: {
        invfile: "invtriu",
        invtransform: ""
    },
    base: "Fuscina"
}, {
    id: 175,
    kind: "item.unique",
    key: "Soulfeast Tine",
    base_code: "9br",
    name: "Soulfeast Tine",
    level: 43,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -20,
        max: -20
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 7,
        max: 7
    }, {
        key: "manasteal",
        param_id: 3,
        min: 7,
        max: 7
    }, {
        key: "stamdrain",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 190,
        max: 270
    }, {
        key: "att",
        param_id: 6,
        min: 150,
        max: 250
    }, {
        key: "dur",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "inv9bru",
        invtransform: "lyel"
    },
    base: "War Fork"
}, {
    id: 176,
    kind: "item.unique",
    key: "Hone Sundan",
    base_code: "9st",
    name: "Hone Sundan",
    level: 45,
    modifiers: [{
        key: "sock",
        param_id: 1,
        param: 3
    }, {
        key: "dmg-norm",
        param_id: 2,
        min: 20,
        max: 40
    }, {
        key: "crush",
        param_id: 3,
        min: 45,
        max: 45
    }, {
        key: "rep-dur",
        param_id: 4,
        param: 10
    }, {
        key: "dmg%",
        param_id: 5,
        min: 160,
        max: 200
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 37
    },
    image: {
        invfile: "invspt",
        invtransform: ""
    },
    base: "Yari"
}, {
    id: 177,
    kind: "item.unique",
    key: "Spire of Honor",
    base_code: "9p9",
    name: "Spire of Honor",
    level: 47,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "light",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "regen",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "balance2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 20,
        max: 40
    }, {
        key: "dmg-dem/lvl",
        param_id: 6,
        param: 14
    }, {
        key: "dmg%",
        param_id: 7,
        min: 200,
        max: 250
    }, {
        key: "skilltab",
        param_id: 8,
        param: 9,
        min: 3,
        max: 3
    }, {
        key: "ac%",
        param_id: 9,
        min: 75,
        max: 75
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invpik",
        invtransform: "lgry"
    },
    base: "Lance"
}, {
    id: 178,
    kind: "item.unique",
    key: "The Meat Scraper",
    base_code: "9b7",
    name: "The Meat Scraper",
    level: 49,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 150,
        max: 200
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "openwounds",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "mag%",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "skilltab",
        param_id: 6,
        param: 13,
        min: 3,
        max: 3
    }, {
        key: "deep-wounds",
        param_id: 7,
        min: 170,
        max: 250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invbar",
        invtransform: "dred"
    },
    base: "Lochaber Axe"
}, {
    id: 179,
    kind: "item.unique",
    key: "Blackleach Blade",
    base_code: "9vo",
    name: "Blackleach Blade",
    level: 50,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -25,
        max: -25
    }, {
        key: "hit-skill",
        param_id: 2,
        param: 443,
        min: 25,
        max: 5
    }, {
        key: "light",
        param_id: 3,
        min: -2,
        max: -2
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 8,
        max: 8
    }, {
        key: "dmg/lvl",
        param_id: 5,
        param: 16
    }, {
        key: "dmg%",
        param_id: 6,
        min: 140,
        max: 180
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invvou",
        invtransform: "blac"
    },
    base: "Bill"
}, {
    id: 180,
    kind: "item.unique",
    key: "Athena's Wrath",
    base_code: "9s8",
    name: "Athena's Wrath",
    level: 50,
    modifiers: [{
        key: "dru",
        param_id: 1,
        min: 2,
        max: 3
    }, {
        key: "dex",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "swing2",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "hp/lvl",
        param_id: 4,
        param: 8
    }, {
        key: "dmg/lvl",
        param_id: 5,
        param: 12
    }, {
        key: "dmg%",
        param_id: 6,
        min: 220,
        max: 260
    }, {
        key: "skilltab",
        param_id: 7,
        param: 15,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "inv9s8u",
        invtransform: ""
    },
    base: "Battle Scythe"
}, {
    id: 181,
    kind: "item.unique",
    key: "Pierre Tombale Couant",
    base_code: "9pa",
    name: "Pierre Tombale Couant",
    level: 51,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 55,
        max: 55
    }, {
        key: "bar",
        param_id: 2,
        min: 3,
        max: 3
    }, {
        key: "balance2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "manasteal",
        param_id: 4,
        min: 6,
        max: 6
    }, {
        key: "dmg-min",
        param_id: 5,
        min: 24,
        max: 36
    }, {
        key: "dmg-max",
        param_id: 6,
        min: 40,
        max: 60
    }, {
        key: "dmg%",
        param_id: 7,
        min: 160,
        max: 220
    }, {
        key: "att",
        param_id: 8,
        min: 100,
        max: 200
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invpax",
        invtransform: "lgld"
    },
    base: "Partizan"
}, {
    id: 182,
    kind: "item.unique",
    key: "Husoldal Evo",
    base_code: "9h9",
    name: "Husoldal Evo",
    level: 52,
    modifiers: [{
        key: "regen",
        param_id: 1,
        min: 40,
        max: 60
    }, {
        key: "att",
        param_id: 2,
        min: 200,
        max: 250
    }, {
        key: "noheal",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-norm",
        param_id: 4,
        min: 20,
        max: 32
    }, {
        key: "dmg%",
        param_id: 5,
        min: 240,
        max: 280
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invhal",
        invtransform: ""
    },
    base: "Bec-de-Corbin"
}, {
    id: 183,
    kind: "item.unique",
    key: "Grim's Burning Dead",
    base_code: "9wc",
    name: "Grim's Burning Dead",
    level: 52,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 131,
        max: 232
    }, {
        key: "res-fire",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "dmg%",
        param_id: 3,
        min: 220,
        max: 260
    }, {
        key: "skill",
        param_id: 4,
        param: 80,
        min: 3,
        max: 5
    }, {
        key: "ease",
        param_id: 5,
        min: -50,
        max: -50
    }, {
        key: "nec",
        param_id: 6,
        min: 2,
        max: 3
    }, {
        key: "reduce-ac",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "grims-extra-skele-mage",
        param_id: 8,
        min: 6,
        max: 6
    }, {
        key: "att",
        param_id: 9,
        min: 200,
        max: 250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invwsc",
        invtransform: "cred"
    },
    base: "Grim Scythe"
}, {
    id: 184,
    kind: "item.unique",
    key: "Razorswitch",
    base_code: "8ss",
    name: "Razorswitch",
    level: 36,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "thorns",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "mana",
        param_id: 3,
        min: 175,
        max: 175
    }, {
        key: "hp",
        param_id: 4,
        min: 80,
        max: 80
    }, {
        key: "red-mag",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "res-all",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "allskills",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invsst",
        invtransform: ""
    },
    base: "Jo Staff"
}, {
    id: 185,
    kind: "item.unique",
    key: "Ribcracker",
    base_code: "8ls",
    name: "Ribcracker",
    level: 39,
    modifiers: [{
        key: "dmg-norm",
        param_id: 1,
        min: 30,
        max: 65
    }, {
        key: "dmg%",
        param_id: 2,
        min: 200,
        max: 300
    }, {
        key: "crush",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "ac",
        param_id: 5,
        min: 100,
        max: 100
    }, {
        key: "ac%",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "balance2",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "swing2",
        param_id: 8,
        min: 50,
        max: 50
    }, {
        key: "dur",
        param_id: 9,
        min: 100,
        max: 100
    }, {
        key: "cast2",
        param_id: 10,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invlst",
        invtransform: "lblu"
    },
    base: "Quarterstaff"
}, {
    id: 186,
    kind: "item.unique",
    key: "Chromatic Ire",
    base_code: "8cs",
    name: "Chromatic Ire",
    level: 43,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "res-all",
        param_id: 2,
        min: 25,
        max: 40
    }, {
        key: "cast1",
        param_id: 3,
        min: 45,
        max: 45
    }, {
        key: "light-thorns",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "hp%",
        param_id: 5,
        min: 20,
        max: 25
    }, {
        key: "skill",
        param_id: 6,
        param: 61,
        min: 1,
        max: 2
    }, {
        key: "skill",
        param_id: 7,
        param: 63,
        min: 1,
        max: 2
    }, {
        key: "skill",
        param_id: 8,
        param: 65,
        min: 1,
        max: 2
    }, {
        key: "cast-skill",
        param_id: 9,
        param: 17,
        min: 10,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invcstu",
        invtransform: ""
    },
    base: "Cedar Staff"
}, {
    id: 187,
    kind: "item.unique",
    key: "Warpspear",
    base_code: "8bs",
    name: "Warpspear",
    level: 47,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "skill",
        param_id: 3,
        param: 54,
        min: 3,
        max: 3
    }, {
        key: "cast-skill",
        param_id: 4,
        param: 55,
        min: 25,
        max: 10
    }, {
        key: "skill",
        param_id: 5,
        param: 58,
        min: 3,
        max: 3
    }, {
        key: "ac-miss",
        param_id: 6,
        min: 250,
        max: 250
    }, {
        key: "skill",
        param_id: 7,
        param: 369,
        min: 2,
        max: 3
    }, {
        key: "cast3",
        param_id: 8,
        min: 55,
        max: 55
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "invbst",
        invtransform: "cblu"
    },
    base: "Gothic Staff"
}, {
    id: 188,
    kind: "item.unique",
    key: "Skullcollector",
    base_code: "8ws",
    name: "Skull Collector",
    level: 49,
    modifiers: [{
        key: "mana%",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "allskills",
        param_id: 3,
        min: 2,
        max: 3
    }, {
        key: "mag%/lvl",
        param_id: 4,
        param: 8
    }, {
        key: "nec",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "cast3",
        param_id: 6,
        min: 60,
        max: 60
    }, {
        key: "cast-skill",
        param_id: 7,
        param: 68,
        min: 3,
        max: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "inv8wsu",
        invtransform: "blac"
    },
    base: "Rune Staff"
}, {
    id: 189,
    kind: "item.unique",
    key: "Skystrike",
    base_code: "8sb",
    name: "Skystrike",
    level: 36,
    modifiers: [{
        key: "dmg-ltng",
        param_id: 1,
        min: 1,
        max: 250
    }, {
        key: "att",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "enr",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 5,
        min: 150,
        max: 200
    }, {
        key: "hit-skill",
        param_id: 6,
        param: 56,
        min: 30,
        max: 8
    }, {
        key: "ama",
        param_id: 7,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invsbw",
        invtransform: ""
    },
    base: "Edge Bow"
}, {
    id: 190,
    kind: "item.unique",
    key: "Riphook",
    base_code: "8hb",
    name: "Riphook",
    level: 39,
    modifiers: [{
        key: "openwounds",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "dmg%",
        param_id: 2,
        min: 220,
        max: 260
    }, {
        key: "slow",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "mana",
        param_id: 4,
        min: 35,
        max: 35
    }, {
        key: "swing2",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "lifesteal",
        param_id: 6,
        min: 7,
        max: 10
    }, {
        key: "Deep-Wounds",
        param_id: 7,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invhbw",
        invtransform: "cred"
    },
    base: "Razor Bow"
}, {
    id: 191,
    kind: "item.unique",
    key: "Kuko Shakaku",
    base_code: "8lb",
    name: "Kuko Shakaku",
    level: 41,
    modifiers: [{
        key: "explosivearrow",
        param_id: 1,
        min: 7,
        max: 7
    }, {
        key: "dmg%",
        param_id: 2,
        min: 150,
        max: 180
    }, {
        key: "pierce",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "dmg-fire",
        param_id: 4,
        min: 40,
        max: 180
    }, {
        key: "skilltab",
        param_id: 5,
        min: 3,
        max: 3
    }, {
        key: "mana-kill",
        param_id: 6,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 33
    },
    image: {
        invfile: "inv8lbu",
        invtransform: "lpur"
    },
    base: "Cedar Bow"
}, {
    id: 192,
    kind: "item.unique",
    key: "Endlesshail",
    base_code: "8cb",
    name: "Endlesshail",
    level: 44,
    modifiers: [{
        key: "res-cold",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "mana",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 59,
        min: 6,
        max: 24
    }, {
        key: "oskill",
        param_id: 4,
        param: 26,
        min: 3,
        max: 5
    }, {
        key: "dmg%",
        param_id: 5,
        min: 180,
        max: 220
    }, {
        key: "dmg-cold",
        param_id: 6,
        param: 75,
        min: 15,
        max: 30
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invcbwu",
        invtransform: ""
    },
    base: "Double Bow"
}, {
    id: 193,
    kind: "item.unique",
    key: "Whichwild String",
    base_code: "8s8",
    name: "Witchwild String",
    level: 47,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 442,
        min: 14,
        max: 31
    }, {
        key: "res-all",
        param_id: 2,
        min: 20,
        max: 40
    }, {
        key: "deadly/lvl",
        param_id: 3,
        param: 4
    }, {
        key: "dmg%",
        param_id: 4,
        min: 150,
        max: 190
    }, {
        key: "magicarrow",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "sock",
        param_id: 6,
        min: 2,
        max: 4
    }],
    requirements: {
        level: 39
    },
    image: {
        invfile: "inv8s8u",
        invtransform: "lblu"
    },
    base: "Short Siege Bow"
}, {
    id: 194,
    kind: "item.unique",
    key: "Cliffkiller",
    base_code: "8l8",
    name: "Cliffkiller",
    level: 49,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 2,
        min: 190,
        max: 230
    }, {
        key: "ac-miss",
        param_id: 3,
        min: 80,
        max: 80
    }, {
        key: "knock",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "hp",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "dmg-min",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "dmg-max",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "swing2",
        param_id: 8,
        min: 80,
        max: 80
    }, {
        key: "pierce",
        param_id: 9,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invlbb",
        invtransform: ""
    },
    base: "Large Siege Bow"
}, {
    id: 195,
    kind: "item.unique",
    key: "Magewrath",
    base_code: "8sw",
    name: "Magewrath",
    level: 51,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 5,
        max: 15
    }, {
        key: "red-mag",
        param_id: 2,
        min: 9,
        max: 13
    }, {
        key: "skill",
        param_id: 3,
        param: 22,
        min: 4,
        max: 4
    }, {
        key: "att",
        param_id: 4,
        min: 250,
        max: 250
    }, {
        key: "dex",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "stupidity",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 25,
        max: 50
    }, {
        key: "dmg%",
        param_id: 8,
        min: 180,
        max: 210
    }, {
        key: "ama",
        param_id: 9,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 10,
        param: 6,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invswbu",
        invtransform: ""
    },
    base: "Rune Bow"
}, {
    id: 196,
    kind: "item.unique",
    key: "Godstrike Arch",
    base_code: "8lw",
    name: "Goldstrike Arch",
    level: 54,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 200,
        max: 250
    }, {
        key: "att%",
        param_id: 2,
        min: 100,
        max: 150
    }, {
        key: "dmg-undead",
        param_id: 3,
        min: 250,
        max: 300
    }, {
        key: "dmg-demon",
        param_id: 4,
        min: 250,
        max: 300
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 121,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "regen",
        param_id: 7,
        min: 12,
        max: 24
    }],
    requirements: {
        level: 46
    },
    image: {
        invfile: "invlwb",
        invtransform: "lgry"
    },
    base: "Gothic Bow"
}, {
    id: 197,
    kind: "item.unique",
    key: "Langer Briser",
    base_code: "8lx",
    name: "Langer Briser",
    level: 40,
    modifiers: [{
        key: "knock",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg%",
        param_id: 2,
        min: 170,
        max: 200
    }, {
        key: "mag%",
        param_id: 3,
        min: 30,
        max: 60
    }, {
        key: "hp",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "dmg-max",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "dmg-ltng",
        param_id: 6,
        min: 1,
        max: 312
    }, {
        key: "swing2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "inv8lxu",
        invtransform: ""
    },
    base: "Arbalest"
}, {
    id: 198,
    kind: "item.unique",
    key: "Pus Spiter",
    base_code: "8mx",
    name: "Pus Spitter",
    level: 44,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 100,
        min: 384,
        max: 384
    }, {
        key: "hit-skill",
        param_id: 2,
        param: 447,
        min: 28,
        max: 35
    }, {
        key: "ease",
        param_id: 3,
        min: -60,
        max: -60
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 92,
        min: 9,
        max: 6
    }, {
        key: "swing2",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "dmg%",
        param_id: 6,
        min: 150,
        max: 220
    }, {
        key: "att/lvl",
        param_id: 7,
        param: 10
    }, {
        key: "allskills",
        param_id: 8,
        min: 2,
        max: 3
    }, {
        key: "heal-hit",
        param_id: 9,
        min: 20,
        max: 25
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "inv8mxu",
        invtransform: "cgrn"
    },
    base: "Siege Crossbow"
}, {
    id: 199,
    kind: "item.unique",
    key: "Buriza-Do Kyanon",
    base_code: "8hx",
    name: "Buriza-Do Kyanon",
    level: 59,
    modifiers: [{
        key: "pierce",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 2,
        min: 35,
        max: 35
    }, {
        key: "ac",
        param_id: 3,
        min: 75,
        max: 150
    }, {
        key: "dmg/lvl",
        param_id: 4,
        param: 10
    }, {
        key: "swing2",
        param_id: 5,
        min: 60,
        max: 60
    }, {
        key: "dmg%",
        param_id: 6,
        min: 200,
        max: 275
    }, {
        key: "freeze",
        param_id: 7,
        min: 3,
        max: 3
    }, {
        key: "dmg-cold",
        param_id: 8,
        param: 200,
        min: 32,
        max: 196
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invhxbu",
        invtransform: ""
    },
    base: "Ballista"
}, {
    id: 200,
    kind: "item.unique",
    key: "Demon Machine",
    base_code: "8rx",
    name: "Demon Machine",
    level: 57,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 333,
        max: 666
    }, {
        key: "mana",
        param_id: 2,
        min: 33,
        max: 66
    }, {
        key: "hit-skill",
        param_id: 3,
        min: 15,
        max: 16
    }, {
        key: "explosivearrow",
        param_id: 4,
        min: 6,
        max: 6
    }, {
        key: "dmg%",
        param_id: 5,
        min: 265,
        max: 315
    }, {
        key: "att",
        param_id: 6,
        min: 333,
        max: 666
    }, {
        key: "reanimate",
        param_id: 7,
        param: 492,
        min: 6,
        max: 6
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invrxbu",
        invtransform: "blac"
    },
    base: "Chu-Ko-Nu"
}, {
    id: 201,
    kind: "item.unique",
    key: "Armor",
    base_code: "",
    name: "Armor",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 202,
    kind: "item.unique",
    key: "Peasent Crown",
    base_code: "xap",
    name: "Peasant Crown",
    level: 36,
    modifiers: [{
        key: "enr",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "vit",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "allskills",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "move2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "regen",
        param_id: 5,
        min: 6,
        max: 12
    }, {
        key: "ac%",
        param_id: 6,
        min: 100,
        max: 100
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invcap",
        invtransform: ""
    },
    base: "War Hat"
}, {
    id: 203,
    kind: "item.unique",
    key: "Rockstopper",
    base_code: "xkp",
    name: "Rockstopper",
    level: 39,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "balance2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "ac%",
        param_id: 4,
        min: 160,
        max: 220
    }, {
        key: "res-fire",
        param_id: 5,
        min: 20,
        max: 50
    }, {
        key: "res-cold",
        param_id: 6,
        min: 20,
        max: 40
    }, {
        key: "vit",
        param_id: 7,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invxkpu",
        invtransform: ""
    },
    base: "Sallet"
}, {
    id: 204,
    kind: "item.unique",
    key: "Stealskull",
    base_code: "xlm",
    name: "Stealskull",
    level: 43,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 3,
        max: 5
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "balance2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 200,
        max: 240
    }, {
        key: "mag%",
        param_id: 6,
        min: 30,
        max: 50
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invhlmu",
        invtransform: ""
    },
    base: "Casque"
}, {
    id: 205,
    kind: "item.unique",
    key: "Darksight Helm",
    base_code: "xhl",
    name: "Darksight Helm",
    level: 46,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: -4,
        max: -4
    }, {
        key: "ac/lvl",
        param_id: 2,
        param: 24
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "manasteal",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "gethit-skill",
        param_id: 5,
        param: 71,
        min: 16,
        max: 3
    }, {
        key: "oskill",
        param_id: 6,
        param: 264,
        min: 1,
        max: 1
    }, {
        key: "res-fire",
        param_id: 7,
        min: 20,
        max: 40
    }, {
        key: "stupidity",
        param_id: 8,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invfhlu",
        invtransform: "blac"
    },
    base: "Basinet"
}, {
    id: 206,
    kind: "item.unique",
    key: "Valkiry Wing",
    base_code: "xhm",
    name: "Valkyrie Wing",
    level: 52,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 200
    }, {
        key: "move2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "balance2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "ama",
        param_id: 4,
        min: 1,
        max: 2
    }, {
        key: "mana-kill",
        param_id: 5,
        min: 3,
        max: 6
    }, {
        key: "dmg%",
        param_id: 6,
        min: 40,
        max: 60
    }, {
        key: "skill",
        param_id: 7,
        param: 32,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invghm",
        invtransform: ""
    },
    base: "Winged Helm"
}, {
    id: 207,
    kind: "item.unique",
    key: "Crown of Thieves",
    base_code: "xrn",
    name: "Crown of Thieves",
    level: 57,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 5,
        max: 10
    }, {
        key: "hp",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "gold%",
        param_id: 4,
        min: 80,
        max: 100
    }, {
        key: "res-fire",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "ac%",
        param_id: 6,
        min: 160,
        max: 200
    }, {
        key: "mag%",
        param_id: 7,
        min: 40,
        max: 65
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invxrnu",
        invtransform: "dgld"
    },
    base: "Grand Crown"
}, {
    id: 208,
    kind: "item.unique",
    key: "Blackhorn's Face",
    base_code: "xsk",
    name: "Blackhorn's Face",
    level: 49,
    modifiers: [{
        key: "light-thorns",
        param_id: 1,
        min: 225,
        max: 325
    }, {
        key: "slow",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "noheal",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "abs-ltng",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "res-ltng",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "ac%",
        param_id: 6,
        min: 180,
        max: 220
    }, {
        key: "res-ltng-max",
        param_id: 7,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invmsk",
        invtransform: "blac"
    },
    base: "Death Mask"
}, {
    id: 209,
    kind: "item.unique",
    key: "Vampiregaze",
    base_code: "xh9",
    name: "Vampire Gaze",
    level: 49,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 6,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 6,
        max: 10
    }, {
        key: "stamdrain",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "red-dmg%",
        param_id: 4,
        min: 15,
        max: 25
    }, {
        key: "red-mag",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "ac%",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "dmg-cold",
        param_id: 7,
        param: 100,
        min: 30,
        max: 60
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invbhmu",
        invtransform: "cgrn"
    },
    base: "Grim Helm"
}, {
    id: 210,
    kind: "item.unique",
    key: "The Spirit Shroud",
    base_code: "xui",
    name: "The Spirit Shroud",
    level: 36,
    modifiers: [{
        key: "nofreeze",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "red-mag",
        param_id: 3,
        min: 7,
        max: 11
    }, {
        key: "regen",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 150,
        max: 150
    }, {
        key: "cast2",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "curse-effectiveness",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invqlt",
        invtransform: ""
    },
    base: "Ghost Armor"
}, {
    id: 211,
    kind: "item.unique",
    key: "Skin of the Vipermagi",
    base_code: "xea",
    name: "Skin of the Vipermagi",
    level: 37,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 120
    }, {
        key: "res-all",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "cast3",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "red-mag",
        param_id: 4,
        min: 5,
        max: 8
    }, {
        key: "allskills",
        param_id: 5,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invlea",
        invtransform: "dblu"
    },
    base: "Serpentskin Armor"
}, {
    id: 212,
    kind: "item.unique",
    key: "Skin of the Flayerd One",
    base_code: "xla",
    name: "Skin of the Flayed One",
    level: 39,
    modifiers: [{
        key: "rep-dur",
        param_id: 1,
        param: 25
    }, {
        key: "regen",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "dur",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 5,
        max: 7
    }, {
        key: "ac%",
        param_id: 5,
        min: 150,
        max: 190
    }, {
        key: "dmg-fire",
        param_id: 6,
        min: 80,
        max: 135
    }, {
        key: "res-fire",
        param_id: 7,
        min: 20,
        max: 45
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invhla",
        invtransform: "lred"
    },
    base: "Demonhide Armor"
}, {
    id: 213,
    kind: "item.unique",
    key: "Ironpelt",
    base_code: "xtu",
    name: "Iron Pelt",
    level: 41,
    modifiers: [{
        key: "dur",
        param_id: 1,
        min: 125,
        max: 125
    }, {
        key: "hp",
        param_id: 2,
        min: 80,
        max: 100
    }, {
        key: "red-mag",
        param_id: 3,
        min: 10,
        max: 16
    }, {
        key: "red-dmg",
        param_id: 4,
        min: 15,
        max: 20
    }, {
        key: "ac/lvl",
        param_id: 5,
        param: 24
    }, {
        key: "ac%",
        param_id: 6,
        min: 50,
        max: 100
    }, {
        key: "block",
        param_id: 7,
        min: 20,
        max: 40
    }],
    requirements: {
        level: 33
    },
    image: {
        invfile: "invxtuu",
        invtransform: "dgry"
    },
    base: "Trellised Armor"
}, {
    id: 214,
    kind: "item.unique",
    key: "Spiritforge",
    base_code: "xng",
    name: "Spirit Forge",
    level: 43,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 4,
        max: 4
    }, {
        key: "hp/lvl",
        param_id: 2,
        param: 10
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 20,
        max: 65
    }, {
        key: "res-fire",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "ac%",
        param_id: 5,
        min: 120,
        max: 160
    }, {
        key: "str",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "sock",
        param_id: 7,
        param: 2
    }, {
        key: "fireskill",
        param_id: 8,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invrng",
        invtransform: ""
    },
    base: "Linked Mail"
}, {
    id: 215,
    kind: "item.unique",
    key: "Crow Caw",
    base_code: "xcl",
    name: "Crow Caw",
    level: 45,
    modifiers: [{
        key: "openwounds",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "ac%",
        param_id: 2,
        min: 150,
        max: 180
    }, {
        key: "dex",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "Deep-Wounds",
        param_id: 4,
        min: 70,
        max: 70
    }, {
        key: "swing2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 6,
        min: 50,
        max: 80
    }, {
        key: "pierce",
        param_id: 7,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 37
    },
    image: {
        invfile: "invscl",
        invtransform: ""
    },
    base: "Tigulated Mail"
}, {
    id: 216,
    kind: "item.unique",
    key: "Shaftstop",
    base_code: "xhn",
    name: "Shaftstop",
    level: 46,
    modifiers: [{
        key: "ac-miss",
        param_id: 1,
        min: 250,
        max: 250
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "hp",
        param_id: 3,
        min: 100,
        max: 140
    }, {
        key: "ac%",
        param_id: 4,
        min: 180,
        max: 220
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invchn",
        invtransform: ""
    },
    base: "Mesh Armor"
}, {
    id: 217,
    kind: "item.unique",
    key: "Duriel's Shell",
    base_code: "xrs",
    name: "Duriel's Shell",
    level: 49,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "ac/lvl",
        param_id: 2,
        param: 10
    }, {
        key: "hp/lvl",
        param_id: 3,
        min: 8,
        max: 12
    }, {
        key: "ac%",
        param_id: 4,
        min: 160,
        max: 200
    }, {
        key: "res-fire",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "res-pois",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "res-cold",
        param_id: 8,
        min: 50,
        max: 50
    }, {
        key: "nofreeze",
        param_id: 9,
        min: 1,
        max: 1
    }, {
        key: "dur",
        param_id: 10,
        min: 100,
        max: 100
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invbrs",
        invtransform: "oran"
    },
    base: "Cuirass"
}, {
    id: 218,
    kind: "item.unique",
    key: "Skullder's Ire",
    base_code: "xpl",
    name: "Skullder's Ire",
    level: 50,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "mag%/lvl",
        param_id: 2,
        min: 8,
        max: 12
    }, {
        key: "ac%",
        param_id: 3,
        min: 160,
        max: 200
    }, {
        key: "dur",
        param_id: 4,
        min: 60,
        max: 60
    }, {
        key: "red-mag",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "rep-dur",
        param_id: 6,
        param: 20
    }, {
        key: "*vit",
        param_id: 7,
        min: -10,
        max: -10
    }, {
        key: "*enr",
        param_id: 8,
        min: -10,
        max: -10
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invspl",
        invtransform: ""
    },
    base: "Russet Armor"
}, {
    id: 219,
    kind: "item.unique",
    key: "Guardian Angel",
    base_code: "xlt",
    name: "Guardian Angel",
    level: 53,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 4,
        max: 4
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ac%",
        param_id: 3,
        min: 180,
        max: 200
    }, {
        key: "block2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "block",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "att-dem/lvl",
        param_id: 6,
        param: 28
    }, {
        key: "res-fire-max",
        param_id: 7,
        min: 4,
        max: 6
    }, {
        key: "res-cold-max",
        param_id: 8,
        min: 4,
        max: 6
    }, {
        key: "res-ltng-max",
        param_id: 9,
        min: 4,
        max: 6
    }, {
        key: "res-pois-max",
        param_id: 10,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invplt",
        invtransform: "lgry"
    },
    base: "Templar Coat"
}, {
    id: 220,
    kind: "item.unique",
    key: "Toothrow",
    base_code: "xld",
    name: "Toothrow",
    level: 56,
    modifiers: [{
        key: "Deep-Wounds",
        param_id: 1,
        min: 300,
        max: 350
    }, {
        key: "ac",
        param_id: 2,
        min: 40,
        max: 60
    }, {
        key: "str",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "openwounds",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "res-fire",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "ac%",
        param_id: 6,
        min: 160,
        max: 220
    }, {
        key: "dur",
        param_id: 7,
        min: 15,
        max: 15
    }, {
        key: "deadly",
        param_id: 8,
        min: 15,
        max: 25
    }],
    requirements: {
        level: 48
    },
    image: {
        invfile: "invfld",
        invtransform: "whit"
    },
    base: "Sharktooth Armor"
}, {
    id: 221,
    kind: "item.unique",
    key: "Atma's Wail",
    base_code: "xth",
    name: "Atma's Wail",
    level: 59,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "regen",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "mana%",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "ac/lvl",
        param_id: 5,
        param: 16
    }, {
        key: "dur",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "ac%",
        param_id: 7,
        min: 120,
        max: 160
    }, {
        key: "mag%",
        param_id: 8,
        min: 25,
        max: 25
    }, {
        key: "allskills",
        param_id: 9,
        min: 1,
        max: 1
    }, {
        key: "cast2",
        param_id: 10,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 51
    },
    image: {
        invfile: "invgth",
        invtransform: ""
    },
    base: "Embossed Plate"
}, {
    id: 222,
    kind: "item.unique",
    key: "Black Hades",
    base_code: "xul",
    name: "Black Hades",
    level: 61,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: -2,
        max: -2
    }, {
        key: "att-demon",
        param_id: 2,
        min: 400,
        max: 450
    }, {
        key: "half-freeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "sock",
        param_id: 4,
        min: 3,
        max: 4
    }, {
        key: "ac%",
        param_id: 5,
        min: 140,
        max: 200
    }, {
        key: "dmg-demon",
        param_id: 6,
        min: 185,
        max: 225
    }],
    requirements: {
        level: 53
    },
    image: {
        invfile: "invful",
        invtransform: ""
    },
    base: "Chaos Armor"
}, {
    id: 223,
    kind: "item.unique",
    key: "Corpsemourn",
    base_code: "xar",
    name: "Corpsemourn",
    level: 63,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 8,
        max: 8
    }, {
        key: "vit",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "res-cold",
        param_id: 3,
        min: 35,
        max: 35
    }, {
        key: "reanimate",
        param_id: 4,
        param: 1,
        min: 5,
        max: 5
    }, {
        key: "ac%",
        param_id: 5,
        min: 150,
        max: 180
    }, {
        key: "fire-min",
        param_id: 6,
        min: 120,
        max: 160
    }, {
        key: "fire-max",
        param_id: 7,
        min: 300,
        max: 340
    }, {
        key: "oskill",
        param_id: 8,
        param: 74,
        min: 30,
        max: 40
    }, {
        key: "ease",
        param_id: 9,
        min: -15,
        max: -15
    }],
    requirements: {
        level: 55
    },
    image: {
        invfile: "invxaru",
        invtransform: "blac"
    },
    base: "Ornate Plate"
}, {
    id: 224,
    kind: "item.unique",
    key: "Que-Hegan's Wisdon",
    base_code: "xtp",
    name: "Que-Hegan's Wisdom",
    level: 59,
    modifiers: [{
        key: "cast2",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 2,
        min: 6,
        max: 9
    }, {
        key: "red-mag",
        param_id: 3,
        min: 6,
        max: 10
    }, {
        key: "enr",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "balance2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 6,
        min: 140,
        max: 160
    }, {
        key: "allskills",
        param_id: 7,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 51
    },
    image: {
        invfile: "invltp",
        invtransform: ""
    },
    base: "Mage Plate"
}, {
    id: 225,
    kind: "item.unique",
    key: "Visceratuant",
    base_code: "xuc",
    name: "Visceratuant",
    level: 36,
    modifiers: [{
        key: "sor",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "block2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "block",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "ac%",
        param_id: 4,
        min: 100,
        max: 150
    }, {
        key: "light-thorns",
        param_id: 5,
        min: 35,
        max: 50
    }, {
        key: "extra-ltng",
        param_id: 6,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invbucu",
        invtransform: ""
    },
    base: "Defender"
}, {
    id: 226,
    kind: "item.unique",
    key: "Mosers Blessed Circle",
    base_code: "xml",
    name: "Moser's Blessed Circle",
    level: 39,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "block",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "sock",
        param_id: 3,
        param: 2
    }, {
        key: "ac%",
        param_id: 4,
        min: 180,
        max: 220
    }, {
        key: "block2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "curse-effectiveness",
        param_id: 6,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invxmlu",
        invtransform: ""
    },
    base: "Round Shield"
}, {
    id: 227,
    kind: "item.unique",
    key: "Stormchaser",
    base_code: "xrg",
    name: "Stormchaser",
    level: 43,
    modifiers: [{
        key: "dmg-ltng",
        param_id: 1,
        min: 1,
        max: 270
    }, {
        key: "block",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 5,
        min: 150,
        max: 250
    }, {
        key: "ac%",
        param_id: 6,
        min: 160,
        max: 220
    }, {
        key: "move2",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "gethit-skill",
        param_id: 8,
        param: 59,
        min: 8,
        max: 9
    }, {
        key: "gethit-skill",
        param_id: 9,
        param: 245,
        min: 8,
        max: 15
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invxrgu",
        invtransform: "cblu"
    },
    base: "Scutum"
}, {
    id: 228,
    kind: "item.unique",
    key: "Tiamat's Rebuke",
    base_code: "xit",
    name: "Tiamat's Rebuke",
    level: 46,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 150,
        min: 40,
        max: 80
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 53,
        max: 142
    }, {
        key: "dmg-ltng",
        param_id: 3,
        min: 1,
        max: 180
    }, {
        key: "res-all",
        param_id: 4,
        min: 25,
        max: 35
    }, {
        key: "ac%",
        param_id: 5,
        min: 140,
        max: 200
    }, {
        key: "gethit-skill",
        param_id: 6,
        param: 44,
        min: 15,
        max: 19
    }, {
        key: "gethit-skill",
        param_id: 7,
        param: 48,
        min: 15,
        max: 17
    }, {
        key: "gethit-skill",
        param_id: 8,
        param: 62,
        min: 15,
        max: 12
    }, {
        key: "dur",
        param_id: 9,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invkitu",
        invtransform: "lgry"
    },
    base: "Dragon Shield"
}, {
    id: 229,
    kind: "item.unique",
    key: "Kerke's Sanctuary",
    base_code: "xow",
    name: "Gerke's Sanctuary",
    level: 52,
    modifiers: [{
        key: "red-dmg",
        param_id: 1,
        min: 14,
        max: 18
    }, {
        key: "red-mag",
        param_id: 2,
        min: 14,
        max: 18
    }, {
        key: "regen",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "ac%",
        param_id: 4,
        min: 180,
        max: 240
    }, {
        key: "dur",
        param_id: 5,
        min: 100,
        max: 100
    }, {
        key: "block",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "res-all",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "allskills",
        param_id: 8,
        min: 1,
        max: 1
    }, {
        key: "block2",
        param_id: 9,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invtowu",
        invtransform: "lgrn"
    },
    base: "Pavise"
}, {
    id: 230,
    kind: "item.unique",
    key: "Radimant's Sphere",
    base_code: "xts",
    name: "Radament's Sphere",
    level: 58,
    modifiers: [{
        key: "gethit-skill",
        param_id: 1,
        param: 92,
        min: 12,
        max: 35
    }, {
        key: "res-pois",
        param_id: 2,
        min: 50,
        max: 75
    }, {
        key: "ac%",
        param_id: 3,
        min: 160,
        max: 200
    }, {
        key: "block",
        param_id: 4,
        min: 35,
        max: 35
    }, {
        key: "block2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "poisskill",
        param_id: 6,
        min: 1,
        max: 2
    }, {
        key: "dur",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "cast2",
        param_id: 8,
        min: 30,
        max: 30
    }, {
        key: "dmg-pois",
        param_id: 9,
        param: 50,
        min: 1230,
        max: 1230
    }],
    requirements: {
        level: 50
    },
    image: {
        invfile: "invgtsu",
        invtransform: ""
    },
    base: "Ancient Shield"
}, {
    id: 231,
    kind: "item.unique",
    key: "Lidless Wall",
    base_code: "xsh",
    name: "Lidless Wall",
    level: 49,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 2
    }, {
        key: "cast2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 4,
        max: 6
    }, {
        key: "ac%",
        param_id: 5,
        min: 80,
        max: 130
    }, {
        key: "enr",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "mana%",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 41
    },
    image: {
        invfile: "invxshu",
        invtransform: "dgld"
    },
    base: "Grim Shield"
}, {
    id: 232,
    kind: "item.unique",
    key: "Lance Guard",
    base_code: "xpk",
    name: "Lance Guard",
    level: 43,
    modifiers: [{
        key: "hp/lvl",
        param_id: 1,
        param: 20
    }, {
        key: "balance2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "thorns",
        param_id: 3,
        min: 165,
        max: 265
    }, {
        key: "ac%",
        param_id: 4,
        min: 70,
        max: 120
    }, {
        key: "deadly",
        param_id: 5,
        min: 25,
        max: 35
    }, {
        key: "block2",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 7,
        min: 12,
        max: 16
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invxpku",
        invtransform: ""
    },
    base: "Barbed Shield"
}, {
    id: 233,
    kind: "item.unique",
    key: "Venom Grip",
    base_code: "xlg",
    name: "Venom Grip",
    level: 37,
    modifiers: [{
        key: "res-pois",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "res-pois-max",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "extra-pois",
        param_id: 3,
        min: 10,
        max: 15
    }, {
        key: "crush",
        param_id: 4,
        min: 5,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 5,
        min: 2,
        max: 4
    }, {
        key: "ac",
        param_id: 6,
        min: 15,
        max: 25
    }, {
        key: "ac%",
        param_id: 7,
        min: 130,
        max: 160
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invlgl",
        invtransform: ""
    },
    base: "Demonhide Gloves"
}, {
    id: 234,
    kind: "item.unique",
    key: "Gravepalm",
    base_code: "xvg",
    name: "Gravepalm",
    level: 39,
    modifiers: [{
        key: "enr",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dmg-undead",
        param_id: 3,
        min: 100,
        max: 200
    }, {
        key: "att-undead",
        param_id: 4,
        min: 100,
        max: 200
    }, {
        key: "ac%",
        param_id: 5,
        min: 140,
        max: 180
    }, {
        key: "deadly",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "skilltab",
        param_id: 7,
        param: 8,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "invvgl",
        invtransform: ""
    },
    base: "Sharkskin Gloves"
}, {
    id: 235,
    kind: "item.unique",
    key: "Ghoulhide",
    base_code: "xmg",
    name: "Ghoulhide",
    level: 44,
    modifiers: [{
        key: "att-und/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "dmg-und/lvl",
        param_id: 2,
        param: 16
    }, {
        key: "manasteal",
        param_id: 3,
        min: 4,
        max: 5
    }, {
        key: "hp",
        param_id: 4,
        min: 20,
        max: 40
    }, {
        key: "ac%",
        param_id: 5,
        min: 150,
        max: 190
    }, {
        key: "swing2",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invmgl",
        invtransform: ""
    },
    base: "Heavy Bracers"
}, {
    id: 236,
    kind: "item.unique",
    key: "Lavagout",
    base_code: "xtg",
    name: "Lava Gout",
    level: 50,
    modifiers: [{
        key: "res-fire",
        param_id: 1,
        min: 24,
        max: 36
    }, {
        key: "half-freeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 52,
        min: 2,
        max: 10
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 150,
        max: 200
    }, {
        key: "dmg-fire",
        param_id: 6,
        min: 26,
        max: 92
    }, {
        key: "dur",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "res-fire-max",
        param_id: 8,
        min: 3,
        max: 5
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invtgl",
        invtransform: ""
    },
    base: "Battle Gauntlets"
}, {
    id: 237,
    kind: "item.unique",
    key: "Hellmouth",
    base_code: "xhg",
    name: "Hellmouth",
    level: 55,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 30,
        max: 144
    }, {
        key: "ac%",
        param_id: 2,
        min: 150,
        max: 200
    }, {
        key: "dur",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "hit-skill",
        param_id: 4,
        param: 56,
        min: 4,
        max: 34
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 229,
        min: 8,
        max: 22
    }, {
        key: "thorns",
        param_id: 6,
        min: 250,
        max: 400
    }, {
        key: "pierce-fire",
        param_id: 7,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invhgl",
        invtransform: ""
    },
    base: "War Gauntlets"
}, {
    id: 238,
    kind: "item.unique",
    key: "Infernostride",
    base_code: "xlb",
    name: "Infernostride",
    level: 37,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 24,
        max: 66
    }, {
        key: "move2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "res-fire-max",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "res-fire",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "light",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 6,
        min: 120,
        max: 150
    }, {
        key: "gold%",
        param_id: 7,
        min: 40,
        max: 70
    }, {
        key: "ac",
        param_id: 8,
        min: 15,
        max: 15
    }, {
        key: "gethit-skill",
        param_id: 9,
        param: 46,
        min: 18,
        max: 16
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invlbt",
        invtransform: ""
    },
    base: "Demonhide Boots"
}, {
    id: 239,
    kind: "item.unique",
    key: "Waterwalk",
    base_code: "xvb",
    name: "Waterwalk",
    level: 40,
    modifiers: [{
        key: "block2",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "move2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "dex",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "ac%",
        param_id: 4,
        min: 180,
        max: 210
    }, {
        key: "hp",
        param_id: 5,
        min: 45,
        max: 65
    }, {
        key: "stam",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "res-fire-max",
        param_id: 7,
        min: 5,
        max: 5
    }, {
        key: "regen-stam",
        param_id: 8,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "invvbt",
        invtransform: ""
    },
    base: "Sharkskin Boots"
}, {
    id: 240,
    kind: "item.unique",
    key: "Silkweave",
    base_code: "xmb",
    name: "Silkweave",
    level: 44,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 190
    }, {
        key: "mana-kill",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "ac-miss",
        param_id: 3,
        min: 200,
        max: 200
    }, {
        key: "mana%",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "move2",
        param_id: 5,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invmbt",
        invtransform: ""
    },
    base: "Mesh Boots"
}, {
    id: 241,
    kind: "item.unique",
    key: "Wartraveler",
    base_code: "xtb",
    name: "War Traveler",
    level: 50,
    modifiers: [{
        key: "vit",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "mag%",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "dur",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "move2",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "ac%",
        param_id: 6,
        min: 150,
        max: 190
    }, {
        key: "dmg-norm",
        param_id: 7,
        min: 15,
        max: 25
    }, {
        key: "thorns",
        param_id: 8,
        min: 5,
        max: 10
    }, {
        key: "stamdrain",
        param_id: 9,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invtbt",
        invtransform: ""
    },
    base: "Battle Boots"
}, {
    id: 242,
    kind: "item.unique",
    key: "Gorerider",
    base_code: "xhb",
    name: "Gore Rider",
    level: 55,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -25,
        max: -25
    }, {
        key: "deadly",
        param_id: 2,
        min: 15,
        max: 20
    }, {
        key: "move2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "crush",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "openwounds",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 160,
        max: 200
    }, {
        key: "dur",
        param_id: 7,
        min: 10,
        max: 10
    }, {
        key: "Deep-Wounds",
        param_id: 8,
        min: 140,
        max: 200
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invhbt",
        invtransform: ""
    },
    base: "War Boots"
}, {
    id: 243,
    kind: "item.unique",
    key: "String of Ears",
    base_code: "zlb",
    name: "String of Ears",
    level: 37,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 10,
        max: 15
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 10,
        max: 15
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 6,
        max: 8
    }, {
        key: "ac%",
        param_id: 4,
        min: 150,
        max: 180
    }, {
        key: "ac",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "dur",
        param_id: 6,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invlbl",
        invtransform: ""
    },
    base: "Demonhide Sash"
}, {
    id: 244,
    kind: "item.unique",
    key: "Razortail",
    base_code: "zvb",
    name: "Razortail",
    level: 39,
    modifiers: [{
        key: "thorns/lvl",
        param_id: 1,
        param: 8
    }, {
        key: "dex",
        param_id: 2,
        min: 15,
        max: 20
    }, {
        key: "pierce",
        param_id: 3,
        min: 33,
        max: 33
    }, {
        key: "ac",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "ac%",
        param_id: 5,
        min: 120,
        max: 150
    }, {
        key: "dmg-max",
        param_id: 6,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "invvbl",
        invtransform: ""
    },
    base: "Sharkskin Belt"
}, {
    id: 245,
    kind: "item.unique",
    key: "Gloomstrap",
    base_code: "zmb",
    name: "Gloom's Trap",
    level: 45,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: -3,
        max: -3
    }, {
        key: "mana%",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "manasteal",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "ac%",
        param_id: 4,
        min: 120,
        max: 150
    }, {
        key: "vit",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "regen-mana",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "cast2",
        param_id: 7,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invmbl",
        invtransform: ""
    },
    base: "Mesh Belt"
}, {
    id: 246,
    kind: "item.unique",
    key: "Snowclash",
    base_code: "ztb",
    name: "Snowclash",
    level: 49,
    modifiers: [{
        key: "gethit-skill",
        param_id: 1,
        param: 59,
        min: 5
    }, {
        key: "res-cold-max",
        param_id: 2,
        min: 5,
        max: 8
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 75,
        min: 39,
        max: 63
    }, {
        key: "ac%",
        param_id: 4,
        min: 130,
        max: 170
    }, {
        key: "res-cold",
        param_id: 5,
        min: 30,
        max: 45
    }, {
        key: "coldskill",
        param_id: 6,
        min: 1,
        max: 2
    }, {
        key: "half-freeze",
        param_id: 7,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invtbl",
        invtransform: ""
    },
    base: "Battle Belt"
}, {
    id: 247,
    kind: "item.unique",
    key: "Thudergod's Vigor",
    base_code: "zhb",
    name: "Thundergod's Vigor",
    level: 55,
    modifiers: [{
        key: "gethit-skill",
        param_id: 1,
        param: 121,
        min: 8,
        max: 17
    }, {
        key: "ltng-min",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 3,
        min: 150,
        max: 250
    }, {
        key: "res-ltng-max",
        param_id: 4,
        min: 5,
        max: 8
    }, {
        key: "ltngskill",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 6,
        min: 160,
        max: 200
    }, {
        key: "vit",
        param_id: 7,
        min: 10,
        max: 15
    }, {
        key: "str",
        param_id: 8,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invhbl",
        invtransform: ""
    },
    base: "War Belt"
}, {
    id: 248,
    kind: "item.unique",
    key: "Elite Uniques",
    base_code: "",
    name: "Elite Uniques",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 249,
    kind: "item.unique",
    key: "Harlequin Crest",
    base_code: "uap",
    name: "Harlequin Crest",
    level: 69,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "hp/lvl",
        param_id: 2,
        param: 8
    }, {
        key: "mana/lvl",
        param_id: 3,
        param: 8
    }, {
        key: "mag%",
        param_id: 4,
        min: 25,
        max: 50
    }, {
        key: "enr",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "str",
        param_id: 6,
        min: 2,
        max: 2
    }, {
        key: "dex",
        param_id: 7,
        min: 2,
        max: 2
    }, {
        key: "vit",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "red-dmg%",
        param_id: 9,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 62
    },
    image: {
        invfile: "invcap",
        invtransform: "cgrn"
    },
    base: "Shako"
}, {
    id: 250,
    kind: "item.unique",
    key: "Veil of Steel",
    base_code: "uhm",
    name: "Veil of Steel",
    level: 77,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 30,
        max: 40
    }, {
        key: "ac%",
        param_id: 2,
        min: 160,
        max: 220
    }, {
        key: "str",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "vit",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 5,
        min: 60,
        max: 100
    }, {
        key: "dur",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "ac",
        param_id: 7,
        min: 140,
        max: 140
    }, {
        key: "allskills",
        param_id: 8,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invvos",
        invtransform: "lgry"
    },
    base: "Spired Helm"
}, {
    id: 251,
    kind: "item.unique",
    key: "The Gladiator's Bane",
    base_code: "utu",
    name: "The Gladiator's Bane",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 200
    }, {
        key: "red-mag",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "thorns",
        param_id: 4,
        min: 600,
        max: 700
    }, {
        key: "res-pois-len",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "dur",
        param_id: 6,
        min: 103,
        max: 103
    }, {
        key: "balance2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "oskill",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "nofreeze",
        param_id: 9,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "invstu",
        invtransform: "lgry"
    },
    base: "Wire Fleece"
}, {
    id: 252,
    kind: "item.unique",
    key: "Arkaine's Valor",
    base_code: "upl",
    name: "Arkaine's Valor",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 180
    }, {
        key: "balance2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "allskills",
        param_id: 3,
        min: 1,
        max: 2
    }, {
        key: "red-dmg",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "vit/lvl",
        param_id: 5,
        min: 8,
        max: 8
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "arkaines",
        invtransform: ""
    },
    base: "Balrog Skin"
}, {
    id: 253,
    kind: "item.unique",
    key: "Blackoak Shield",
    base_code: "uml",
    name: "Blackoak Shield",
    level: 67,
    modifiers: [{
        key: "dex/lvl",
        param_id: 1,
        param: 4
    }, {
        key: "ac%",
        param_id: 2,
        min: 160,
        max: 200
    }, {
        key: "res-cold-max",
        param_id: 3,
        min: 6,
        max: 10
    }, {
        key: "equipped-skill",
        param_id: 4,
        min: 11,
        max: 11
    }, {
        key: "dur",
        param_id: 5,
        min: 45,
        max: 45
    }, {
        key: "hp/lvl",
        param_id: 6,
        param: 10
    }, {
        key: "block2",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "nofreeze",
        param_id: 8,
        min: 1,
        max: 1
    }, {
        key: "pierce-cold",
        param_id: 9,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invsmlu",
        invtransform: ""
    },
    base: "Luna"
}, {
    id: 254,
    kind: "item.unique",
    key: "Stormshield",
    base_code: "uit",
    name: "Stormshield",
    level: 77,
    modifiers: [{
        key: "ac/lvl",
        param_id: 1,
        param: 30
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "str",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "indestruct",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "block2",
        param_id: 5,
        min: 35,
        max: 35
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 25,
        max: 25
    }, {
        key: "block",
        param_id: 7,
        min: 25,
        max: 25
    }, {
        key: "res-cold",
        param_id: 8,
        min: 40,
        max: 50
    }, {
        key: "light-thorns",
        param_id: 9,
        min: 150,
        max: 250
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invkitu",
        invtransform: ""
    },
    base: "Monarch"
}, {
    id: 255,
    kind: "item.unique",
    key: "Hellslayer",
    base_code: "7bt",
    name: "Hellslayer",
    level: 71,
    modifiers: [{
        key: "str/lvl",
        param_id: 1,
        param: 4
    }, {
        key: "vit/lvl",
        param_id: 2,
        param: 4
    }, {
        key: "dmg%/lvl",
        param_id: 3,
        param: 24
    }, {
        key: "fire-min",
        param_id: 4,
        min: 400,
        max: 400
    }, {
        key: "fire-max",
        param_id: 5,
        min: 600,
        max: 600
    }, {
        key: "pierce-fire",
        param_id: 6,
        min: 25,
        max: 35
    }, {
        key: "dmg%",
        param_id: 7,
        min: 140,
        max: 200
    }, {
        key: "hit-skill",
        param_id: 8,
        min: 33,
        max: 45
    }, {
        key: "swing2",
        param_id: 9,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invbtxu",
        invtransform: "dred"
    },
    base: "Decapitator"
}, {
    id: 256,
    kind: "item.unique",
    key: "Messerschmidt's Reaver",
    base_code: "7ga",
    name: "Messerschmidt's Reaver",
    level: 75,
    modifiers: [{
        key: "dmg%/lvl",
        param_id: 1,
        param: 20
    }, {
        key: "dmg%",
        param_id: 2,
        min: 200,
        max: 250
    }, {
        key: "str",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "vit",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "enr",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "att%",
        param_id: 7,
        min: 100,
        max: 100
    }, {
        key: "swing2",
        param_id: 8,
        min: 20,
        max: 20
    }, {
        key: "openwounds",
        param_id: 9,
        min: 35,
        max: 35
    }, {
        key: "deep-wounds",
        param_id: 10,
        min: 1050,
        max: 1250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invgaxu",
        invtransform: "blac"
    },
    base: "Champion Axe"
}, {
    id: 257,
    kind: "item.unique",
    key: "Baranar's Star",
    base_code: "7mt",
    name: "Baranar's Star",
    level: 70,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 200,
        max: 200
    }, {
        key: "dmg%",
        param_id: 2,
        min: 200,
        max: 250
    }, {
        key: "dex",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "str",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "swing2",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "dur",
        param_id: 6,
        min: 100,
        max: 100
    }, {
        key: "dmg-ltng",
        param_id: 7,
        min: 50,
        max: 300
    }, {
        key: "dmg-fire",
        param_id: 8,
        min: 50,
        max: 300
    }, {
        key: "dmg-cold",
        param_id: 9,
        min: 50,
        max: 300
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invmstu",
        invtransform: "lred"
    },
    base: "Devil Star"
}, {
    id: 258,
    kind: "item.unique",
    key: "Schaefer's Hammer",
    base_code: "7wh",
    name: "Schaefer's Hammer",
    level: 83,
    modifiers: [{
        key: "hit-skill",
        param_id: 1,
        param: 42,
        min: 20,
        max: 25
    }, {
        key: "hp",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "att/lvl",
        param_id: 3,
        param: 16
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 50,
        max: 75
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "dmg/lvl",
        param_id: 6,
        param: 16
    }, {
        key: "rep-dur",
        param_id: 7,
        param: 10
    }, {
        key: "dmg%",
        param_id: 8,
        min: 200,
        max: 260
    }, {
        key: "light",
        param_id: 9,
        min: 4,
        max: 8
    }, {
        key: "dmg-ltng",
        param_id: 10,
        min: 75,
        max: 585
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 79
    },
    image: {
        invfile: "invwhm",
        invtransform: "lblu"
    },
    base: "Legendary Mallet"
}, {
    id: 259,
    kind: "item.unique",
    key: "The Cranium Basher",
    base_code: "7gm",
    name: "The Cranium Basher",
    level: 85,
    modifiers: [{
        key: "swing2",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 2,
        param: 442,
        min: 8,
        max: 33
    }, {
        key: "str",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "res-all",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "crush",
        param_id: 5,
        min: 75,
        max: 75
    }, {
        key: "dmg-norm",
        param_id: 6,
        min: 20,
        max: 25
    }, {
        key: "dmg%",
        param_id: 7,
        min: 220,
        max: 260
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 87
    },
    image: {
        invfile: "invgma",
        invtransform: "blac"
    },
    base: "Thunder Maul"
}, {
    id: 260,
    kind: "item.unique",
    key: "Lightsabre",
    base_code: "7cr",
    name: "Lightsabre",
    level: 66,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 7,
        max: 7
    }, {
        key: "att-skill",
        param_id: 2,
        param: 53,
        min: 18,
        max: 28
    }, {
        key: "ignore-ac",
        param_id: 3,
        param: 1,
        min: 1,
        max: 1
    }, {
        key: "abs-ltng%",
        param_id: 4,
        min: 5,
        max: 10
    }, {
        key: "swing2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "dmg-mag",
        param_id: 6,
        min: 60,
        max: 120
    }, {
        key: "dmg-ltng",
        param_id: 7,
        min: 1,
        max: 700
    }, {
        key: "manasteal",
        param_id: 8,
        min: 5,
        max: 7
    }, {
        key: "dmg%",
        param_id: 9,
        min: 150,
        max: 250
    }, {
        key: "dmg-norm",
        param_id: 10,
        min: 10,
        max: 30
    }, {
        key: "aura",
        param_id: 11,
        min: 6,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 58
    },
    image: {
        invfile: "invcrsu",
        invtransform: ""
    },
    base: "Phase Blade"
}, {
    id: 261,
    kind: "item.unique",
    key: "Doombringer",
    base_code: "7b7",
    name: "Doombringer",
    level: 75,
    modifiers: [{
        key: "hp%",
        param_id: 1,
        min: 10,
        max: 15
    }, {
        key: "dmg%",
        param_id: 2,
        min: 240,
        max: 280
    }, {
        key: "att%",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "rep-dur",
        param_id: 4,
        param: 25
    }, {
        key: "dmg-norm",
        param_id: 5,
        min: 120,
        max: 150
    }, {
        key: "hit-skill",
        param_id: 6,
        param: 443,
        min: 14,
        max: 21
    }, {
        key: "lifesteal",
        param_id: 7,
        min: 8,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invbswu",
        invtransform: "dred"
    },
    base: "Champion Sword"
}, {
    id: 262,
    kind: "item.unique",
    key: "The Grandfather",
    base_code: "7gd",
    name: "The Grandfather",
    level: 85,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "vit",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "enr",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "att%",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "hp",
        param_id: 6,
        min: 80,
        max: 80
    }, {
        key: "dmg/lvl",
        param_id: 7,
        param: 20
    }, {
        key: "allskills",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 9,
        min: 200,
        max: 260
    }, {
        key: "skill",
        param_id: 10,
        param: 154,
        min: 2,
        max: 3
    }, {
        key: "rep-dur",
        param_id: 11,
        param: 25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 81
    },
    image: {
        invfile: "invgsdu",
        invtransform: "lyel"
    },
    base: "Colossus Blade"
}, {
    id: 263,
    kind: "item.unique",
    key: "Wizardspike",
    base_code: "7dg",
    name: "Wizardspike",
    level: 69,
    modifiers: [{
        key: "mana/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "mana%",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "res-all",
        param_id: 4,
        min: 75,
        max: 75
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "cast3",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "ease",
        param_id: 7,
        min: -50,
        max: -50
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invdgr",
        invtransform: "lgry"
    },
    base: "Bone Knife"
}, {
    id: 264,
    kind: "item.unique",
    key: "Constricting Ring",
    base_code: "rin",
    name: "Constricting Ring",
    level: 73,
    modifiers: [{
        key: "regen",
        param_id: 1,
        min: -20,
        max: -20
    }, {
        key: "cast2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "howl",
        param_id: 3,
        min: 16,
        max: 16
    }, {
        key: "heal-kill",
        param_id: 4,
        min: 4,
        max: 6
    }, {
        key: "str",
        param_id: 5,
        min: 12,
        max: 18
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invrin",
        invtransform: ""
    },
    base: "Ring"
}, {
    id: 265,
    kind: "item.unique",
    key: "Stormspire",
    base_code: "7wc",
    name: "Stormspire",
    level: 78,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 75,
        max: 40
    }, {
        key: "dmg%",
        param_id: 3,
        min: 150,
        max: 250
    }, {
        key: "str",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 38,
        min: 60,
        max: 35
    }, {
        key: "swing2",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "ltng-min",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 8,
        min: 1e3,
        max: 1e3
    }, {
        key: "light-thorns",
        param_id: 9,
        min: 700,
        max: 800
    }, {
        key: "extra-ltng",
        param_id: 10,
        min: 20,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invwsc",
        invtransform: "dblu"
    },
    base: "Giant Thresher"
}, {
    id: 266,
    kind: "item.unique",
    key: "Eaglehorn",
    base_code: "6l7",
    name: "Eaglehorn",
    level: 77,
    modifiers: [{
        key: "ignore-ac",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "att/lvl",
        param_id: 2,
        param: 12
    }, {
        key: "dmg%/lvl",
        param_id: 3,
        param: 16
    }, {
        key: "dmg%",
        param_id: 4,
        min: 200,
        max: 250
    }, {
        key: "ama",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "dex",
        param_id: 6,
        min: 60,
        max: 100
    }, {
        key: "oskill",
        param_id: 7,
        param: 221,
        min: 10,
        max: 10
    }, {
        key: "hit-skill",
        param_id: 8,
        param: 221,
        min: 12,
        max: 28
    }, {
        key: "eaglehorn-raven",
        param_id: 9,
        min: 1250,
        max: 1250
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invlbb",
        invtransform: "dgld"
    },
    base: "Crusader Bow"
}, {
    id: 267,
    kind: "item.unique",
    key: "Windforce",
    base_code: "6lw",
    name: "Windforce",
    level: 80,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "dmg/lvl",
        param_id: 2,
        param: 16
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 240,
        min: 12,
        max: 40
    }, {
        key: "manasteal",
        param_id: 4,
        min: 6,
        max: 8
    }, {
        key: "knock",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "dmg%",
        param_id: 6,
        min: 275,
        max: 350
    }, {
        key: "swing2",
        param_id: 7,
        min: 40,
        max: 40
    }, {
        key: "str",
        param_id: 8,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invlwb",
        invtransform: "dyel"
    },
    base: "Hydra Bow"
}, {
    id: 268,
    kind: "item.unique",
    key: "Rings",
    base_code: "",
    name: "Rings",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 269,
    kind: "item.unique",
    key: "Bul Katho's Wedding Band",
    base_code: "rin",
    name: "Bul-Kathos' Wedding Band",
    level: 66,
    modifiers: [{
        key: "hp/lvl",
        param_id: 1,
        param: 4
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 4,
        max: 6
    }, {
        key: "stam",
        param_id: 4,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 58
    },
    image: {
        invfile: "invrin",
        invtransform: "dpur"
    },
    base: "Ring"
}, {
    id: 270,
    kind: "item.unique",
    key: "The Cat's Eye",
    base_code: "amu",
    name: "The Cat's Eye",
    level: 58,
    modifiers: [{
        key: "move2",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "ac",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "ac-miss",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "dex",
        param_id: 5,
        min: 25,
        max: 35
    }],
    requirements: {
        level: 50
    },
    image: {
        invfile: "invamu",
        invtransform: "oran"
    },
    base: "Amulet"
}, {
    id: 271,
    kind: "item.unique",
    key: "The Rising Sun",
    base_code: "amu",
    name: "The Rising Sun",
    level: 73,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 4,
        max: 4
    }, {
        key: "gethit-skill",
        param_id: 2,
        param: 56,
        min: 4,
        max: 23
    }, {
        key: "fire-min",
        param_id: 3,
        min: 80,
        max: 124
    }, {
        key: "fire-max",
        param_id: 4,
        min: 200,
        max: 248
    }, {
        key: "fireskill",
        param_id: 5,
        min: 1,
        max: 2
    }, {
        key: "regen",
        param_id: 6,
        min: 10,
        max: 10
    }, {
        key: "pierce-fire",
        param_id: 7,
        min: 4,
        max: 8
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invamu",
        invtransform: "lgld"
    },
    base: "Amulet"
}, {
    id: 272,
    kind: "item.unique",
    key: "Crescent Moon",
    base_code: "amu",
    name: "Crescent Moon",
    level: 58,
    modifiers: [{
        key: "manasteal",
        param_id: 1,
        min: 4,
        max: 8
    }, {
        key: "red-mag",
        param_id: 2,
        min: 5,
        max: 10
    }, {
        key: "swing2",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "coldskill",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "mana",
        param_id: 5,
        min: 45,
        max: 45
    }, {
        key: "lifesteal",
        param_id: 6,
        min: 3,
        max: 6
    }, {
        key: "cast2",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 50
    },
    image: {
        invfile: "invamu",
        invtransform: "lblu"
    },
    base: "Amulet"
}, {
    id: 273,
    kind: "item.unique",
    key: "Mara's Kaleidoscope",
    base_code: "amu",
    name: "Mara's Kaleidoscope",
    level: 80,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "res-all",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "all-stats",
        param_id: 3,
        min: 5,
        max: 8
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invamu",
        invtransform: "oran"
    },
    base: "Amulet"
}, {
    id: 274,
    kind: "item.unique",
    key: "Atma's Scarab",
    base_code: "amu",
    name: "Atma's Scarab",
    level: 60,
    modifiers: [{
        key: "Deep-Wounds",
        param_id: 1,
        min: 200,
        max: 300
    }, {
        key: "res-pois",
        param_id: 2,
        min: 30,
        max: 60
    }, {
        key: "light",
        param_id: 3,
        min: 3,
        max: 3
    }, {
        key: "thorns",
        param_id: 4,
        min: 300,
        max: 450
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 442,
        min: 8,
        max: 15
    }, {
        key: "att%",
        param_id: 6,
        min: 40,
        max: 60
    }, {
        key: "openwounds",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 60
    },
    image: {
        invfile: "invamu",
        invtransform: "cgrn"
    },
    base: "Amulet"
}, {
    id: 275,
    kind: "item.unique",
    key: "Dwarf Star",
    base_code: "rin",
    name: "Dwarf Star",
    level: 53,
    modifiers: [{
        key: "gold%",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "stam",
        param_id: 2,
        min: 35,
        max: 50
    }, {
        key: "block",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "hp",
        param_id: 4,
        min: 35,
        max: 50
    }, {
        key: "red-mag",
        param_id: 5,
        min: 12,
        max: 15
    }, {
        key: "abs-fire%",
        param_id: 6,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invrin",
        invtransform: "dgry"
    },
    base: "Ring"
}, {
    id: 276,
    kind: "item.unique",
    key: "Raven Frost",
    base_code: "rin",
    name: "Raven Frost",
    level: 53,
    modifiers: [{
        key: "nofreeze",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg-cold",
        param_id: 2,
        param: 100,
        min: 15,
        max: 45
    }, {
        key: "abs-cold%",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "mana",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dex",
        param_id: 5,
        min: 15,
        max: 20
    }, {
        key: "att",
        param_id: 6,
        min: 150,
        max: 250
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invrin",
        invtransform: "cblu"
    },
    base: "Ring"
}, {
    id: 277,
    kind: "item.unique",
    key: "Highlord's Wrath",
    base_code: "amu",
    name: "Highlord's Wrath",
    level: 73,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 30,
        max: 40
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 300
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "allskills",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "deadly/lvl",
        param_id: 5,
        param: 2
    }, {
        key: "light-thorns",
        param_id: 6,
        min: 100,
        max: 150
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invamu",
        invtransform: "bwht"
    },
    base: "Amulet"
}, {
    id: 278,
    kind: "item.unique",
    key: "Saracen's Chance",
    base_code: "amu",
    name: "Saracen's Chance",
    level: 55,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 15,
        max: 25
    }, {
        key: "dmg%",
        param_id: 2,
        min: 30,
        max: 50
    }, {
        key: "all-stats",
        param_id: 3,
        min: 12,
        max: 12
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 444,
        min: 10,
        max: 12
    }, {
        key: "curse-effectiveness",
        param_id: 5,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invamu",
        invtransform: "dpur"
    },
    base: "Amulet"
}, {
    id: 279,
    kind: "item.unique",
    key: "Class Specific",
    base_code: "",
    name: "Class-specific",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 280,
    kind: "item.unique",
    key: "Arreat's Face",
    base_code: "baa",
    name: "Arreat's Face",
    level: 50,
    modifiers: [{
        key: "bar",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 12,
        min: 1,
        max: 2
    }, {
        key: "ac%",
        param_id: 3,
        min: 150,
        max: 200
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "att%",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "str",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "dex",
        param_id: 7,
        min: 10,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 8,
        min: 3,
        max: 6
    }, {
        key: "res-all",
        param_id: 9,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invba5",
        invtransform: ""
    },
    base: "Slayer Guard"
}, {
    id: 281,
    kind: "item.unique",
    key: "Homunculus",
    base_code: "nea",
    name: "Homunculus",
    level: 50,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 2,
        min: 150,
        max: 200
    }, {
        key: "block2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "block",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "enr",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 6,
        min: 33,
        max: 33
    }, {
        key: "mana-kill",
        param_id: 7,
        min: 5,
        max: 5
    }, {
        key: "res-all",
        param_id: 8,
        min: 30,
        max: 40
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invne5",
        invtransform: ""
    },
    base: "Hierophant Trophy"
}, {
    id: 282,
    kind: "item.unique",
    key: "Titan's Revenge",
    base_code: "ama",
    name: "Titan's Revenge",
    level: 50,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 2,
        min: 1,
        max: 2
    }, {
        key: "dmg%",
        param_id: 3,
        min: 150,
        max: 250
    }, {
        key: "move2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 8,
        min: 5,
        max: 9
    }, {
        key: "dmg-norm",
        param_id: 9,
        min: 25,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invam5",
        invtransform: ""
    },
    base: "Ceremonial Javelin"
}, {
    id: 283,
    kind: "item.unique",
    key: "Lycander's Aim",
    base_code: "am7",
    name: "Lycander's Aim",
    level: 50,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 3,
        min: 225,
        max: 275
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "reduce-ac",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "enr",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "manasteal",
        param_id: 8,
        min: 5,
        max: 8
    }, {
        key: "dmg-norm",
        param_id: 9,
        min: 25,
        max: 50
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invam2",
        invtransform: ""
    },
    base: "Ceremonial Bow"
}, {
    id: 284,
    kind: "item.unique",
    key: "Lycander's Flank",
    base_code: "am9",
    name: "Lycander's Flank",
    level: 50,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 2,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 3,
        min: 250,
        max: 300
    }, {
        key: "swing2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "red-dmg%",
        param_id: 5,
        min: 15,
        max: 20
    }, {
        key: "str",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "vit",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 8,
        min: 5,
        max: 9
    }, {
        key: "dmg-norm",
        param_id: 9,
        min: 25,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invam4",
        invtransform: ""
    },
    base: "Ceremonial Pike"
}, {
    id: 285,
    kind: "item.unique",
    key: "The Oculus",
    base_code: "oba",
    name: "The Oculus",
    level: 50,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 3
    }, {
        key: "gethit-skill",
        param_id: 2,
        param: 54,
        min: 2,
        max: 1
    }, {
        key: "res-all",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "cast2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "ac%",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "vit",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "enr",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 8,
        min: 5,
        max: 5
    }, {
        key: "mag%",
        param_id: 9,
        min: 25,
        max: 50
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invob5",
        invtransform: ""
    },
    base: "Swirling Crystal"
}, {
    id: 286,
    kind: "item.unique",
    key: "Herald of Zakarum",
    base_code: "pa9",
    name: "Herald of Zakarum",
    level: 50,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 9,
        min: 1,
        max: 2
    }, {
        key: "ac%",
        param_id: 3,
        min: 150,
        max: 200
    }, {
        key: "block2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "block",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 6,
        min: 15,
        max: 25
    }, {
        key: "vit",
        param_id: 7,
        min: 15,
        max: 25
    }, {
        key: "att%",
        param_id: 8,
        min: 30,
        max: 30
    }, {
        key: "res-all",
        param_id: 9,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invpa4",
        invtransform: ""
    },
    base: "Gilded Shield"
}, {
    id: 287,
    kind: "item.unique",
    key: "Cutthroat1",
    base_code: "9tw",
    name: "Bartuc's Cut-Throat",
    level: 50,
    modifiers: [{
        key: "ass",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 20,
        min: 1,
        max: 2
    }, {
        key: "dmg%",
        param_id: 3,
        min: 200,
        max: 300
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "att%",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "str",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 8,
        min: 5,
        max: 9
    }, {
        key: "dmg-norm",
        param_id: 9,
        min: 25,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invclw",
        invtransform: ""
    },
    base: "Greater Talons"
}, {
    id: 288,
    kind: "item.unique",
    key: "Jalal's Mane",
    base_code: "dra",
    name: "Jalal's Mane",
    level: 50,
    modifiers: [{
        key: "dru",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 16,
        min: 1,
        max: 2
    }, {
        key: "ac%",
        param_id: 3,
        min: 150,
        max: 200
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "att%",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "str",
        param_id: 6,
        min: 15,
        max: 20
    }, {
        key: "enr",
        param_id: 7,
        min: 15,
        max: 20
    }, {
        key: "mana-kill",
        param_id: 8,
        min: 5,
        max: 5
    }, {
        key: "res-all",
        param_id: 9,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invdr5",
        invtransform: ""
    },
    base: "Totemic Mask"
}, {
    id: 289,
    kind: "item.unique",
    key: "The Scalper",
    base_code: "9ta",
    name: "The Scalper",
    level: 65,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 200,
        max: 250
    }, {
        key: "att%",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "Deep-Wounds",
        param_id: 3,
        min: 500,
        max: 700
    }, {
        key: "openwounds",
        param_id: 4,
        min: 33,
        max: 33
    }, {
        key: "lifesteal",
        param_id: 5,
        min: 4,
        max: 6
    }, {
        key: "mana-kill",
        param_id: 6,
        min: 4,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 57
    },
    image: {
        invfile: "invtax",
        invtransform: ""
    },
    base: "Francisca"
}, {
    id: 290,
    kind: "item.unique",
    key: "Bloodmoon",
    base_code: "7sb",
    name: "Bloodmoon",
    level: 69,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 280
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 10,
        max: 15
    }, {
        key: "oskill",
        param_id: 3,
        min: 12,
        max: 12
    }, {
        key: "heal-kill",
        param_id: 4,
        min: 7,
        max: 13
    }, {
        key: "openwounds",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 450,
        max: 450
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invsbru",
        invtransform: "cred"
    },
    base: "Elegant Blade"
}, {
    id: 291,
    kind: "item.unique",
    key: "Djinnslayer",
    base_code: "7sm",
    name: "Djinn Slayer",
    level: 73,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 190,
        max: 240
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 250,
        max: 500
    }, {
        key: "dmg-demon",
        param_id: 3,
        min: 200,
        max: 250
    }, {
        key: "att-demon",
        param_id: 4,
        min: 200,
        max: 300
    }, {
        key: "abs-ltng",
        param_id: 5,
        min: 3,
        max: 7
    }, {
        key: "manasteal",
        param_id: 6,
        min: 3,
        max: 6
    }, {
        key: "sock",
        param_id: 7,
        min: 2,
        max: 3
    }, {
        key: "aura",
        param_id: 8,
        min: 6,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invscmu",
        invtransform: "dpur"
    },
    base: "Ataghan"
}, {
    id: 292,
    kind: "item.unique",
    key: "Deathbit",
    base_code: "9tk",
    name: "Deathbit",
    level: 52,
    modifiers: [{
        key: "deadly",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 2,
        min: 180,
        max: 230
    }, {
        key: "att",
        param_id: 3,
        min: 200,
        max: 450
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 7,
        max: 9
    }, {
        key: "manasteal",
        param_id: 5,
        min: 4,
        max: 6
    }, {
        key: "reanimate",
        param_id: 6,
        param: 1,
        min: 7,
        max: 7
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invtkn",
        invtransform: ""
    },
    base: "Battle Dart"
}, {
    id: 293,
    kind: "item.unique",
    key: "Warshrike",
    base_code: "7bk",
    name: "Warshrike",
    level: 83,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 375,
        max: 425
    }, {
        key: "pierce",
        param_id: 2,
        min: 75,
        max: 75
    }, {
        key: "swing2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "deadly",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "hit-skill",
        param_id: 5,
        min: 40,
        max: 35
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invtk3",
        invtransform: "bwht"
    },
    base: "Winged Knife"
}, {
    id: 294,
    kind: "item.unique",
    key: "Gutsiphon",
    base_code: "6rx",
    name: "Gut Siphon",
    level: 79,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 340,
        max: 400
    }, {
        key: "pierce",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 6,
        max: 8
    }, {
        key: "slow",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "openwounds",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "regen",
        param_id: 6,
        min: -30,
        max: -30
    }, {
        key: "deep-wounds",
        param_id: 7,
        min: 1450,
        max: 1450
    }, {
        key: "hit-skill",
        param_id: 8,
        min: 12,
        max: 28
    }, {
        key: "pierce-phys",
        param_id: 12,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invrxbu",
        invtransform: "lgrn"
    },
    base: "Demon Crossbow"
}, {
    id: 295,
    kind: "item.unique",
    key: "Razoredge",
    base_code: "7ha",
    name: "Razor's Edge",
    level: 75,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 225,
        max: 300
    }, {
        key: "swing2",
        param_id: 2,
        min: 60,
        max: 60
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "deadly",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "openwounds",
        param_id: 5,
        min: 60,
        max: 60
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 260,
        max: 340
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invhaxu",
        invtransform: ""
    },
    base: "Tomahawk"
}, {
    id: 296,
    kind: "item.unique",
    key: "Gore Ripper",
    base_code: "",
    name: "Gore Ripper",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: "dred"
    }
}, {
    id: 297,
    kind: "item.unique",
    key: "Demonlimb",
    base_code: "7sp",
    name: "Demon Limb",
    level: 71,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 180,
        max: 230
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 222,
        max: 333
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 7,
        max: 13
    }, {
        key: "charged",
        param_id: 4,
        min: 20,
        max: 23
    }, {
        key: "rep-charge",
        param_id: 5,
        param: 33
    }, {
        key: "dmg-demon",
        param_id: 6,
        min: 123,
        max: 123
    }, {
        key: "res-fire",
        param_id: 7,
        min: 15,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invspcu",
        invtransform: "dgrn"
    },
    base: "Tyrant Club"
}, {
    id: 298,
    kind: "item.unique",
    key: "Steelshade",
    base_code: "ulm",
    name: "Steel Shade",
    level: 70,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 100,
        max: 130
    }, {
        key: "abs-fire",
        param_id: 2,
        min: 4,
        max: 6
    }, {
        key: "manasteal",
        param_id: 3,
        min: 4,
        max: 8
    }, {
        key: "regen",
        param_id: 4,
        min: 30,
        max: 48
    }, {
        key: "allskills",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "block",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "block2",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "gold%",
        param_id: 8,
        min: 60,
        max: 80
    }],
    requirements: {
        level: 62
    },
    image: {
        invfile: "invhlmu",
        invtransform: "blac"
    },
    base: "Armet"
}, {
    id: 299,
    kind: "item.unique",
    key: "Tomb Reaver",
    base_code: "7pa",
    name: "Tomb Reaver",
    level: 86,
    modifiers: [{
        key: "swing2",
        param_id: 1,
        min: 60,
        max: 60
    }, {
        key: "light",
        param_id: 2,
        min: 4,
        max: 4
    }, {
        key: "dmg%",
        param_id: 3,
        min: 200,
        max: 280
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 150,
        max: 230
    }, {
        key: "mag%",
        param_id: 5,
        min: 50,
        max: 80
    }, {
        key: "res-all",
        param_id: 6,
        min: 30,
        max: 50
    }, {
        key: "att-undead",
        param_id: 7,
        min: 250,
        max: 350
    }, {
        key: "reanimate",
        param_id: 8,
        param: 1,
        min: 10,
        max: 10
    }, {
        key: "heal-kill",
        param_id: 9,
        min: 10,
        max: 14
    }, {
        key: "sock",
        param_id: 10,
        min: 2,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 84
    },
    image: {
        invfile: "invpax",
        invtransform: "lyel"
    },
    base: "Cryptic Axe"
}, {
    id: 300,
    kind: "item.unique",
    key: "Deaths's Web",
    base_code: "7gw",
    name: "Death's Web",
    level: 74,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "pierce-pois",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "heal-kill",
        param_id: 3,
        min: 4,
        max: 6
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 4,
        max: 6
    }, {
        key: "skilltab",
        param_id: 5,
        param: 7,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invgwn",
        invtransform: "bwht"
    },
    base: "Unearthed Wand"
}, {
    id: 301,
    kind: "item.unique",
    key: "Nature's Peace",
    base_code: "rin",
    name: "Nature's Peace",
    level: 77,
    modifiers: [{
        key: "noheal",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "rip",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 7,
        max: 11
    }, {
        key: "res-ltng-max",
        param_id: 4,
        min: 1,
        max: 3
    }, {
        key: "charged",
        param_id: 5,
        min: 27,
        max: 2
    }, {
        key: "res-cold-max",
        param_id: 6,
        min: 1,
        max: 3
    }, {
        key: "res-fire-max",
        param_id: 7,
        min: 1,
        max: 3
    }, {
        key: "res-pois-max",
        param_id: 8,
        min: 1,
        max: 3
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invrin",
        invtransform: "dgrn"
    },
    base: "Ring"
}, {
    id: 302,
    kind: "item.unique",
    key: "Azurewrath",
    base_code: "7cr",
    name: "Azurewrath",
    level: 87,
    modifiers: [{
        key: "dmg-mag",
        param_id: 1,
        min: 500,
        max: 650
    }, {
        key: "dmg%",
        param_id: 2,
        min: 280,
        max: 320
    }, {
        key: "aura",
        param_id: 3,
        min: 10,
        max: 12
    }, {
        key: "dmg-cold",
        param_id: 4,
        param: 250,
        min: 250,
        max: 500
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "all-stats",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "light",
        param_id: 7,
        min: 3,
        max: 3
    }, {
        key: "allskills",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "hit-skill",
        param_id: 9,
        min: 18,
        max: 31
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "invcrs",
        invtransform: ""
    },
    base: "Phase Blade"
}, {
    id: 303,
    kind: "item.unique",
    key: "Seraph's Hymn",
    base_code: "amu",
    name: "Seraph's Hymn",
    level: 73,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skilltab",
        param_id: 2,
        param: 11,
        min: 1,
        max: 2
    }, {
        key: "dmg-demon",
        param_id: 3,
        min: 50,
        max: 80
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 50,
        max: 80
    }, {
        key: "att-demon",
        param_id: 5,
        min: 150,
        max: 250
    }, {
        key: "att-undead",
        param_id: 6,
        min: 150,
        max: 250
    }, {
        key: "light",
        param_id: 7,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invamu2",
        invtransform: "bwht"
    },
    base: "Amulet"
}, {
    id: 304,
    kind: "item.unique",
    key: "Zakarum's Salvation",
    base_code: "",
    name: "Zakarum's Salvation",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 305,
    kind: "item.unique",
    key: "Fleshripper",
    base_code: "7kr",
    name: "Fleshripper",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 225,
        max: 275
    }, {
        key: "reduce-ac",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "oskill",
        param_id: 3,
        param: 252,
        min: 4,
        max: 5
    }, {
        key: "crush",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "openwounds",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "deadly",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "Deep-Wounds",
        param_id: 7,
        min: 300,
        max: 360
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invkrsu",
        invtransform: "dred"
    },
    base: "Fanged Knife"
}, {
    id: 306,
    kind: "item.unique",
    key: "Odium",
    base_code: "7fb",
    name: "Odium",
    level: 87,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 290
    }, {
        key: "swing2",
        param_id: 2,
        min: 65,
        max: 65
    }, {
        key: "curse-res",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "dmg-min",
        param_id: 4,
        min: 65,
        max: 65
    }, {
        key: "ease",
        param_id: 5,
        min: -20,
        max: -20
    }, {
        key: "cold-min",
        param_id: 6,
        min: 400,
        max: 400
    }, {
        key: "cold-max",
        param_id: 7,
        min: 500,
        max: 500
    }, {
        key: "demon-heal",
        param_id: 8,
        min: 10,
        max: 15
    }, {
        key: "pierce-cold",
        param_id: 9,
        min: 20,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "odium",
        invtransform: ""
    },
    base: "Colossus Sword"
}, {
    id: 307,
    kind: "item.unique",
    key: "Horizon's Tornado",
    base_code: "7fl",
    name: "Horizon's Tornado",
    level: 72,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 300
    }, {
        key: "swing2",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "cast2",
        param_id: 3,
        min: 35,
        max: 35
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 25,
        max: 28
    }, {
        key: "skill",
        param_id: 5,
        param: 240,
        min: 4,
        max: 6
    }, {
        key: "skill",
        param_id: 6,
        param: 245,
        min: 4,
        max: 6
    }, {
        key: "cast-skill",
        param_id: 7,
        min: 15,
        max: 28
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invfla",
        invtransform: "dpur"
    },
    base: "Scourge"
}, {
    id: 308,
    kind: "item.unique",
    key: "Stone Crusher",
    base_code: "7wh",
    name: "Stone Crusher",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 280
    }, {
        key: "str",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "crush",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "pierce-phys",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "dmg-ac",
        param_id: 5,
        min: -75,
        max: -75
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invwhm",
        invtransform: ""
    },
    base: "Legendary Mallet"
}, {
    id: 309,
    kind: "item.unique",
    key: "Jadetalon",
    base_code: "7wb",
    name: "Jade Talon",
    level: 74,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 320
    }, {
        key: "manasteal",
        param_id: 2,
        min: 10,
        max: 15
    }, {
        key: "res-all",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "skilltab",
        param_id: 5,
        param: 19,
        min: 2,
        max: 3
    }, {
        key: "skilltab",
        param_id: 6,
        param: 20,
        min: 2,
        max: 3
    }, {
        key: "block2",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invktr",
        invtransform: "cgrn"
    },
    base: "Wrist Sword"
}, {
    id: 310,
    kind: "item.unique",
    key: "Shadowdancer",
    base_code: "uhb",
    name: "Shadow Dancer",
    level: 79,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 70,
        max: 100
    }, {
        key: "move2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "balance2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "dex",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "skilltab",
        param_id: 5,
        param: 19,
        min: 1,
        max: 2
    }, {
        key: "ease",
        param_id: 6,
        min: -25,
        max: -25
    }, {
        key: "curse-effectiveness",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invhbt",
        invtransform: "blac"
    },
    base: "Myrmidon Greaves"
}, {
    id: 311,
    kind: "item.unique",
    key: "Cerebus",
    base_code: "drb",
    name: "Cerebus' Bite",
    level: 71,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 130,
        max: 140
    }, {
        key: "skilltab",
        param_id: 2,
        param: 16,
        min: 3,
        max: 4
    }, {
        key: "Deep-Wounds",
        param_id: 3,
        min: 360,
        max: 360
    }, {
        key: "att%",
        param_id: 4,
        min: 80,
        max: 120
    }, {
        key: "openwounds",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "skill",
        param_id: 6,
        param: 232,
        min: 1,
        max: 2
    }, {
        key: "deadly",
        param_id: 7,
        min: 33,
        max: 33
    }, {
        key: "skill",
        param_id: 8,
        param: 242,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invdr1",
        invtransform: "bwht"
    },
    base: "Blood Spirit"
}, {
    id: 312,
    kind: "item.unique",
    key: "Tyrael's Might",
    base_code: "uar",
    name: "Tyrael's Might",
    level: 87,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -100,
        max: -100
    }, {
        key: "indestruct",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ac%",
        param_id: 3,
        min: 120,
        max: 150
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 200,
        max: 250
    }, {
        key: "dmg-demon",
        param_id: 5,
        min: 200,
        max: 250
    }, {
        key: "nofreeze",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "move2",
        param_id: 7,
        min: 45,
        max: 45
    }, {
        key: "res-all",
        param_id: 8,
        min: 20,
        max: 30
    }, {
        key: "str",
        param_id: 9,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 84
    },
    image: {
        invfile: "invaaru",
        invtransform: "dblu"
    },
    base: "Sacred Armor"
}, {
    id: 313,
    kind: "item.unique",
    key: "Souldrain",
    base_code: "umg",
    name: "Soul Drainer",
    level: 82,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 120
    }, {
        key: "manasteal",
        param_id: 2,
        min: 2,
        max: 3
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 2,
        max: 3
    }, {
        key: "regen",
        param_id: 4,
        min: -30,
        max: -30
    }, {
        key: "dmg-ac",
        param_id: 5,
        min: -50,
        max: -50
    }, {
        key: "pierce-phys",
        param_id: 6,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "invmgl",
        invtransform: "dred"
    },
    base: "Vambraces"
}, {
    id: 314,
    kind: "item.unique",
    key: "Runemaster",
    base_code: "72a",
    name: "Rune Master",
    level: 80,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 300
    }, {
        key: "sock",
        param_id: 2,
        min: 4,
        max: 5
    }, {
        key: "res-cold-max",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "nofreeze",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "curse-effectiveness",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "inv2ax",
        invtransform: "lblu"
    },
    base: "Ettin Axe"
}, {
    id: 315,
    kind: "item.unique",
    key: "Deathcleaver",
    base_code: "7wa",
    name: "Death Cleaver",
    level: 78,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 300,
        max: 350
    }, {
        key: "deadly",
        param_id: 2,
        min: 60,
        max: 60
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 33,
        max: 33
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "heal-kill",
        param_id: 5,
        min: 6,
        max: 9
    }, {
        key: "dmg-min",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "max-deadly",
        param_id: 7,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invwax",
        invtransform: ""
    },
    base: "Berserker Axe"
}, {
    id: 316,
    kind: "item.unique",
    key: "Executioner's Justice",
    base_code: "7gi",
    name: "Executioner's Justice",
    level: 83,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 285,
        max: 335
    }, {
        key: "crush",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 33,
        max: 33
    }, {
        key: "kill-skill",
        param_id: 4,
        min: 50,
        max: 25
    }, {
        key: "swing2",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "curse-effectiveness",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "allskills",
        param_id: 7,
        min: 3,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invgix",
        invtransform: "blac"
    },
    base: "Glorious Axe"
}, {
    id: 317,
    kind: "item.unique",
    key: "Stoneraven",
    base_code: "amd",
    name: "Stoneraven",
    level: 72,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 330,
        max: 380
    }, {
        key: "dmg-mag",
        param_id: 2,
        min: 101,
        max: 187
    }, {
        key: "res-all",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "ac",
        param_id: 4,
        min: 400,
        max: 600
    }, {
        key: "skilltab",
        param_id: 5,
        param: 2,
        min: 3,
        max: 4
    }, {
        key: "swing2",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invam3",
        invtransform: ""
    },
    base: "Matriarchal Spear"
}, {
    id: 318,
    kind: "item.unique",
    key: "Leviathan",
    base_code: "uld",
    name: "Leviathan",
    level: 73,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 170,
        max: 200
    }, {
        key: "ac",
        param_id: 2,
        min: 100,
        max: 150
    }, {
        key: "red-dmg%",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "str",
        param_id: 4,
        min: 40,
        max: 50
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "curse-effectiveness",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invfld",
        invtransform: "cgrn"
    },
    base: "Kraken Shell"
}, {
    id: 319,
    kind: "item.unique",
    key: "Larzuk's Champion",
    base_code: "",
    name: "Larzuk's Champion",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "invhfh",
        invtransform: ""
    }
}, {
    id: 320,
    kind: "item.unique",
    key: "Wisp",
    base_code: "rin",
    name: "Wisp Projector",
    level: 84,
    modifiers: [{
        key: "abs-ltng%",
        param_id: 1,
        min: 4,
        max: 6
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "mag%",
        param_id: 3,
        min: 10,
        max: 15
    }, {
        key: "charged",
        param_id: 4,
        min: 13,
        max: 2
    }, {
        key: "charged",
        param_id: 5,
        min: 11,
        max: 7
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invrin",
        invtransform: "bwht"
    },
    base: "Ring"
}, {
    id: 321,
    kind: "item.unique",
    key: "Gargoyle's Bite",
    base_code: "7ts",
    name: "Gargoyle's Bite",
    level: 78,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 330
    }, {
        key: "pierce-pois",
        param_id: 2,
        min: 10,
        max: 15
    }, {
        key: "poisskill",
        param_id: 3,
        min: 2,
        max: 3
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 9,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invtsp",
        invtransform: "cgrn"
    },
    base: "Winged Harpoon"
}, {
    id: 322,
    kind: "item.unique",
    key: "Lacerator",
    base_code: "7b8",
    name: "Lacerator",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 180,
        max: 240
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 8,
        max: 31
    }, {
        key: "swing2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "noheal",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "openwounds",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "Deep-Wounds",
        param_id: 6,
        min: 450,
        max: 450
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invbal",
        invtransform: "blac"
    },
    base: "Winged Axe"
}, {
    id: 323,
    kind: "item.unique",
    key: "Mang Song's Lesson",
    base_code: "6ws",
    name: "Mang Song's Lesson",
    level: 86,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 6,
        max: 6
    }, {
        key: "pierce-fire",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "pierce-ltng",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "pierce-cold",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "cast2",
        param_id: 6,
        min: 85,
        max: 85
    }, {
        key: "cast-skill",
        param_id: 7,
        min: 12,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 82
    },
    image: {
        invfile: "inv8wsu",
        invtransform: "dgld"
    },
    base: "Archon Staff"
}, {
    id: 324,
    kind: "item.unique",
    key: "Viperfork",
    base_code: "7br",
    name: "Viperfork",
    level: 79,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 290
    }, {
        key: "dmg-pois",
        param_id: 2,
        param: 25,
        min: 7168,
        max: 7168
    }, {
        key: "swing2",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "att",
        param_id: 4,
        min: 200,
        max: 250
    }, {
        key: "res-pois",
        param_id: 5,
        min: 30,
        max: 50
    }, {
        key: "pierce-pois",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "poisskill",
        param_id: 7,
        min: 4,
        max: 5
    }, {
        key: "hit-skill",
        param_id: 8,
        min: 12,
        max: 32
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invbrn",
        invtransform: "dgrn"
    },
    base: "Mancatcher"
}, {
    id: 325,
    kind: "item.unique",
    key: "Ethereal Edge",
    base_code: "7ba",
    name: "Ethereal Edge",
    level: 82,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 150,
        max: 180
    }, {
        key: "swing2",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "abs-fire",
        param_id: 3,
        min: 10,
        max: 12
    }, {
        key: "dmg-demon",
        param_id: 4,
        min: 150,
        max: 200
    }, {
        key: "demon-heal",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "att",
        param_id: 6,
        min: 270,
        max: 350
    }, {
        key: "ethereal",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "indestruct",
        param_id: 8,
        min: 1,
        max: 1
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "invbrx",
        invtransform: "whit"
    },
    base: "Silver-edged Axe"
}, {
    id: 326,
    kind: "item.unique",
    key: "Demonhorn's Edge",
    base_code: "bad",
    name: "Demonhorn's Edge",
    level: 69,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 160
    }, {
        key: "openwounds",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 18,
        max: 24
    }, {
        key: "thorns",
        param_id: 4,
        min: 900,
        max: 1050
    }, {
        key: "Deep-Wounds",
        param_id: 5,
        min: 350,
        max: 350
    }, {
        key: "bar",
        param_id: 6,
        min: 2,
        max: 3
    }, {
        key: "swing2",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invba3",
        invtransform: "dgry"
    },
    base: "Destroyer Helm"
}, {
    id: 327,
    kind: "item.unique",
    key: "The Reaper's Toll",
    base_code: "7s8",
    name: "The Reaper's Toll",
    level: 83,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 190,
        max: 290
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 33,
        max: 31
    }, {
        key: "ignore-ac",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 11,
        max: 15
    }, {
        key: "ease",
        param_id: 5,
        min: -25,
        max: -25
    }, {
        key: "deadly",
        param_id: 6,
        min: 33,
        max: 33
    }, {
        key: "dmg-cold",
        param_id: 7,
        min: 4,
        max: 44
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invscy",
        invtransform: ""
    },
    base: "Thresher"
}, {
    id: 328,
    kind: "item.unique",
    key: "Spiritkeeper",
    base_code: "drd",
    name: "Spirit Keeper",
    level: 75,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 170,
        max: 190
    }, {
        key: "balance2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "abs-ltng",
        param_id: 3,
        min: 4,
        max: 6
    }, {
        key: "res-fire",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "abs-cold%",
        param_id: 5,
        min: 4,
        max: 5
    }, {
        key: "res-pois-max",
        param_id: 6,
        min: 5,
        max: 8
    }, {
        key: "dru",
        param_id: 7,
        min: 2,
        max: 2
    }, {
        key: "skill-rand",
        param_id: 8,
        param: 2,
        min: 221,
        max: 250
    }, {
        key: "extra-spirits",
        param_id: 9,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invdr3",
        invtransform: ""
    },
    base: "Earth Spirit"
}, {
    id: 329,
    kind: "item.unique",
    key: "Hellrack",
    base_code: "6hx",
    name: "Hellrack",
    level: 84,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 180,
        max: 230
    }, {
        key: "dmg-elem",
        param_id: 2,
        param: 33,
        min: 63,
        max: 324
    }, {
        key: "swing2",
        param_id: 3,
        min: 60,
        max: 60
    }, {
        key: "att%",
        param_id: 4,
        min: 100,
        max: 150
    }, {
        key: "sock",
        param_id: 5,
        min: 3,
        max: 5
    }, {
        key: "fireskill",
        param_id: 6,
        min: 4,
        max: 5
    }, {
        key: "pierce-fire",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invhxbu",
        invtransform: ""
    },
    base: "Colossus Crossbow"
}, {
    id: 330,
    kind: "item.unique",
    key: "Alma Negra",
    base_code: "pac",
    name: "Alma Negra",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 180,
        max: 210
    }, {
        key: "block2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "allskills",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "block",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "red-mag",
        param_id: 5,
        min: 10,
        max: 18
    }, {
        key: "att%",
        param_id: 6,
        min: 100,
        max: 150
    }, {
        key: "dmg%",
        param_id: 7,
        min: 160,
        max: 200
    }, {
        key: "joust-reduction",
        param_id: 8,
        min: 13,
        max: 13
    }],
    requirements: {
        level: 77
    },
    image: {
        invfile: "invpa2",
        invtransform: "blac"
    },
    base: "Sacred Rondache"
}, {
    id: 331,
    kind: "item.unique",
    key: "Darkforge Spawn",
    base_code: "nef",
    name: "Darkforce Spawn",
    level: 72,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 140,
        max: 180
    }, {
        key: "cast2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "mana%",
        param_id: 3,
        min: 40,
        max: 50
    }, {
        key: "res-fire",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "reanimate",
        param_id: 5,
        param: 312,
        min: 5,
        max: 5
    }, {
        key: "maxcurse",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "skilltab",
        param_id: 7,
        param: 8,
        min: 2,
        max: 3
    }, {
        key: "skilltab",
        param_id: 8,
        param: 6,
        min: 2,
        max: 3
    }, {
        key: "skilltab",
        param_id: 9,
        param: 7,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invne5",
        invtransform: "cred"
    },
    base: "Bloodlord Skull"
}, {
    id: 332,
    kind: "item.unique",
    key: "Widowmaker",
    base_code: "6sw",
    name: "Widowmaker",
    level: 73,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 275,
        max: 350
    }, {
        key: "deadly",
        param_id: 2,
        min: 33,
        max: 33
    }, {
        key: "ignore-ac",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "magicarrow",
        param_id: 4,
        min: 11,
        max: 11
    }, {
        key: "oskill",
        param_id: 5,
        param: 22,
        min: 3,
        max: 5
    }, {
        key: "oskill",
        param_id: 6,
        param: 12,
        min: 3,
        max: 5
    }, {
        key: "ama",
        param_id: 7,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invswbu",
        invtransform: "dred"
    },
    base: "Ward Bow"
}, {
    id: 333,
    kind: "item.unique",
    key: "Bloodraven's Charge",
    base_code: "amb",
    name: "Blood Raven's Charge",
    level: 79,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 330
    }, {
        key: "att%",
        param_id: 2,
        min: 200,
        max: 300
    }, {
        key: "explosivearrow",
        param_id: 3,
        min: 13,
        max: 13
    }, {
        key: "allskills",
        param_id: 4,
        min: 2,
        max: 3
    }, {
        key: "charged",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "skill",
        param_id: 6,
        param: 7,
        min: 2,
        max: 3
    }, {
        key: "extra-revives",
        param_id: 7,
        min: 4,
        max: 4
    }, {
        key: "rep-charge",
        param_id: 8,
        param: 12
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "bravenbow",
        invtransform: ""
    },
    base: "Matriarchal Bow"
}, {
    id: 334,
    kind: "item.unique",
    key: "Ghostflame",
    base_code: "7bl",
    name: "Ghostflame",
    level: 70,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 280,
        max: 340
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 208,
        max: 316
    }, {
        key: "manasteal",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "ethereal",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "indestruct",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "swing2",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "extra-fire",
        param_id: 8,
        min: 15,
        max: 25
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 62
    },
    image: {
        invfile: "invbld",
        invtransform: "cblu"
    },
    base: "Legend Spike"
}, {
    id: 335,
    kind: "item.unique",
    key: "Shadowkiller",
    base_code: "7cs",
    name: "Shadow Killer",
    level: 85,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 170,
        max: 270
    }, {
        key: "reduce-ac",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "freeze",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 4,
        max: 8
    }, {
        key: "hit-skill",
        param_id: 5,
        min: 33,
        max: 24
    }, {
        key: "ethereal",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "indestruct",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "skilltab",
        param_id: 8,
        param: 19,
        min: 3,
        max: 4
    }, {
        key: "cast1",
        param_id: 9,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 78
    },
    image: {
        invfile: "invaxfu",
        invtransform: ""
    },
    base: "Battle Cestus"
}, {
    id: 336,
    kind: "item.unique",
    key: "Gimmershred",
    base_code: "7ta",
    name: "Gimmershred",
    level: 78,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 190,
        max: 240
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 258,
        max: 523
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 100,
        min: 216,
        max: 437
    }, {
        key: "dmg-ltng",
        param_id: 4,
        min: 29,
        max: 581
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invtax",
        invtransform: ""
    },
    base: "Flying Axe"
}, {
    id: 337,
    kind: "item.unique",
    key: "Griffon's Eye",
    base_code: "ci3",
    name: "Griffon's Eye",
    level: 84,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 100,
        max: 200
    }, {
        key: "cast2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "allskills",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "extra-ltng",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "pierce-ltng",
        param_id: 5,
        min: 15,
        max: 20
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invci3",
        invtransform: ""
    },
    base: "Diadem"
}, {
    id: 338,
    kind: "item.unique",
    key: "Windhammer",
    base_code: "7m7",
    name: "Windhammer",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 280
    }, {
        key: "crush",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 33,
        max: 35
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invmau",
        invtransform: "cblu"
    },
    base: "Ogre Maul"
}, {
    id: 339,
    kind: "item.unique",
    key: "Thunderstroke",
    base_code: "amf",
    name: "Thunderstroke",
    level: 77,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 200,
        max: 250
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 511
    }, {
        key: "hit-skill",
        param_id: 3,
        min: 20,
        max: 28
    }, {
        key: "swing2",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "pierce-ltng",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "skill",
        param_id: 6,
        param: 20,
        min: 3,
        max: 3
    }, {
        key: "skilltab",
        param_id: 7,
        param: 2,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invam5",
        invtransform: "dblu"
    },
    base: "Matriarchal Javelin"
}, {
    id: 340,
    kind: "item.unique",
    key: "Giantmaimer",
    base_code: "",
    name: "Giant Maimer",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: "cred"
    }
}, {
    id: 341,
    kind: "item.unique",
    key: "Demon's Arch",
    base_code: "7s7",
    name: "Demon's Arch",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 210,
        max: 310
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 232,
        max: 323
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 6,
        max: 12
    }, {
        key: "pierce-fire",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "dmg-ltng",
        param_id: 6,
        min: 1,
        max: 666
    }, {
        key: "pierce-ltng",
        param_id: 7,
        min: 10,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invssp",
        invtransform: "cred"
    },
    base: "Balrog Spear"
}, {
    id: 342,
    kind: "item.unique",
    key: "Boneflame",
    base_code: "nee",
    name: "Boneflame",
    level: 80,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "move2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "gethit-skill",
        param_id: 3,
        min: 5,
        max: 3
    }, {
        key: "nec",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "res-all",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "heal-kill",
        param_id: 6,
        min: 4,
        max: 8
    }, {
        key: "red-dmg%",
        param_id: 7,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "invne4",
        invtransform: "dred"
    },
    base: "Succubus Skull"
}, {
    id: 343,
    kind: "item.unique",
    key: "Steelpillar",
    base_code: "7p7",
    name: "Steel Pillar",
    level: 77,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 210,
        max: 260
    }, {
        key: "swing2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 4,
        min: 100,
        max: 150
    }, {
        key: "crush",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "pierce-phys",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invpik",
        invtransform: ""
    },
    base: "War Pike"
}, {
    id: 344,
    kind: "item.unique",
    key: "Nightwing's Veil",
    base_code: "uhm",
    name: "Nightwing's Veil",
    level: 75,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 120
    }, {
        key: "allskills",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "dex",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "abs-cold",
        param_id: 4,
        min: 5,
        max: 9
    }, {
        key: "half-freeze",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "extra-cold",
        param_id: 6,
        min: 5,
        max: 10
    }, {
        key: "ease",
        param_id: 7,
        min: -50,
        max: -50
    }, {
        key: "pierce-cold",
        param_id: 8,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invghm",
        invtransform: "cblu"
    },
    base: "Spired Helm"
}, {
    id: 345,
    kind: "item.unique",
    key: "Crown of Ages",
    base_code: "urn",
    name: "Crown of Ages",
    level: 86,
    modifiers: [{
        key: "balance2",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "res-all",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "curse-res",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "ac",
        param_id: 4,
        min: 100,
        max: 150
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "red-dmg%",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "ac%",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "sock",
        param_id: 8,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 82
    },
    image: {
        invfile: "invcrn",
        invtransform: "dgld"
    },
    base: "Corona"
}, {
    id: 346,
    kind: "item.unique",
    key: "Andariel's Visage",
    base_code: "usk",
    name: "Andariel's Visage",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 100,
        max: 150
    }, {
        key: "res-pois",
        param_id: 2,
        min: 70,
        max: 70
    }, {
        key: "allskills",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "res-pois-max",
        param_id: 4,
        min: 8,
        max: 8
    }, {
        key: "swing2",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 6,
        min: 25,
        max: 30
    }, {
        key: "gethit-skill",
        param_id: 7,
        param: 92,
        min: 15,
        max: 30
    }, {
        key: "charged",
        param_id: 8,
        param: 278,
        min: 20,
        max: 3
    }, {
        key: "lifesteal",
        param_id: 9,
        min: 8,
        max: 10
    }, {
        key: "res-fire",
        param_id: 10,
        min: -20,
        max: -20
    }],
    requirements: {
        level: 83
    },
    image: {
        invfile: "invmsk",
        invtransform: "dred"
    },
    base: "Demonhead"
}, {
    id: 347,
    kind: "item.unique",
    key: "Darkfear",
    base_code: "ulm",
    name: "Darkfear",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "invhlmu",
        invtransform: ""
    },
    base: "Armet"
}, {
    id: 348,
    kind: "item.unique",
    key: "Dragonscale",
    base_code: "pae",
    name: "Dragonscale",
    level: 84,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 170,
        max: 200
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "res-fire-max",
        param_id: 3,
        min: 4,
        max: 6
    }, {
        key: "str",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "dmg-fire",
        param_id: 5,
        min: 211,
        max: 371
    }, {
        key: "block-skill",
        param_id: 6,
        min: 24,
        max: 45
    }, {
        key: "extra-fire",
        param_id: 7,
        min: 15,
        max: 20
    }, {
        key: "block",
        param_id: 8,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invpa4",
        invtransform: "dgrn"
    },
    base: "Zakarum Shield"
}, {
    id: 349,
    kind: "item.unique",
    key: "Steel Carapice",
    base_code: "uul",
    name: "Steel Carapace",
    level: 74,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 250,
        max: 280
    }, {
        key: "balance2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "red-dmg",
        param_id: 3,
        min: 19,
        max: 24
    }, {
        key: "res-cold",
        param_id: 4,
        min: 40,
        max: 60
    }, {
        key: "rep-dur",
        param_id: 5,
        param: 10
    }, {
        key: "gethit-skill",
        param_id: 6,
        min: 4,
        max: 26
    }, {
        key: "allskills",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "thorns",
        param_id: 8,
        min: 1400,
        max: 1600
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invful",
        invtransform: "dgry"
    },
    base: "Shadow Plate"
}, {
    id: 350,
    kind: "item.unique",
    key: "Medusa's Gaze",
    base_code: "uow",
    name: "Medusa's Gaze",
    level: 84,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 180
    }, {
        key: "slow",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "gethit-skill",
        param_id: 3,
        min: 10,
        max: 14
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 5,
        max: 9
    }, {
        key: "coldskill",
        param_id: 5,
        min: 2,
        max: 2
    }, {
        key: "res-cold",
        param_id: 6,
        min: 40,
        max: 80
    }, {
        key: "cast2",
        param_id: 7,
        min: 30,
        max: 40
    }, {
        key: "ease",
        param_id: 8,
        min: -25,
        max: -25
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invtowu",
        invtransform: "lred"
    },
    base: "Aegis"
}, {
    id: 351,
    kind: "item.unique",
    key: "Ravenlore",
    base_code: "dre",
    name: "Ravenlore",
    level: 82,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "res-all",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "skilltab",
        param_id: 3,
        param: 17,
        min: 3,
        max: 3
    }, {
        key: "enr",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "pierce-fire",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "skill",
        param_id: 6,
        param: 221,
        min: 7,
        max: 7
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "invdr4",
        invtransform: "dgld"
    },
    base: "Sky Spirit"
}, {
    id: 352,
    kind: "item.unique",
    key: "Boneshade",
    base_code: "7bw",
    name: "Boneshade",
    level: 84,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "cast2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "skill",
        param_id: 3,
        param: 67,
        min: 4,
        max: 5
    }, {
        key: "skill",
        param_id: 4,
        param: 68,
        min: 4,
        max: 5
    }, {
        key: "skill",
        param_id: 5,
        param: 84,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 6,
        param: 93,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 7,
        param: 78,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 79
    },
    image: {
        invfile: "invbwnu",
        invtransform: "dgry"
    },
    base: "Lich Wand"
}, {
    id: 353,
    kind: "item.unique",
    key: "Nethercrow",
    base_code: "",
    name: "Kadala's Heirloom",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: "cblu"
    }
}, {
    id: 354,
    kind: "item.unique",
    key: "Flamebellow",
    base_code: "7gs",
    name: "Flamebellow",
    level: 79,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 170,
        max: 240
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 233,
        max: 482
    }, {
        key: "fireskill",
        param_id: 3,
        min: 3,
        max: 3
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "hit-skill",
        param_id: 5,
        min: 16,
        max: 22
    }, {
        key: "str",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "vit",
        param_id: 7,
        min: 5,
        max: 10
    }, {
        key: "aura",
        param_id: 8,
        param: 102,
        min: 24,
        max: 28
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invgisu",
        invtransform: "cred"
    },
    base: "Balrog Blade"
}, {
    id: 355,
    kind: "item.unique",
    key: "Fathom",
    base_code: "obf",
    name: "Death's Fathom",
    level: 81,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "extra-cold",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "cast2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "res-fire",
        param_id: 4,
        min: 25,
        max: 40
    }, {
        key: "res-ltng",
        param_id: 5,
        min: 25,
        max: 40
    }, {
        key: "heal-kill",
        param_id: 6,
        min: 2,
        max: 5
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invob5",
        invtransform: ""
    },
    base: "Dimensional Shard"
}, {
    id: 356,
    kind: "item.unique",
    key: "Wolfhowl",
    base_code: "bac",
    name: "Wolfhowl",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "skilltab",
        param_id: 2,
        param: 14,
        min: 2,
        max: 3
    }, {
        key: "str",
        param_id: 3,
        min: 10,
        max: 15
    }, {
        key: "dex",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "oskill",
        param_id: 5,
        param: 223,
        min: 4,
        max: 6
    }, {
        key: "oskill",
        param_id: 6,
        param: 237,
        min: 12,
        max: 15
    }, {
        key: "oskill",
        param_id: 7,
        param: 232,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 79
    },
    image: {
        invfile: "invba2",
        invtransform: "cred"
    },
    base: "Fury Visor"
}, {
    id: 357,
    kind: "item.unique",
    key: "Spirit Ward",
    base_code: "uts",
    name: "Spirit Ward",
    level: 76,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 130,
        max: 180
    }, {
        key: "abs-cold",
        param_id: 2,
        min: 6,
        max: 11
    }, {
        key: "res-all",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "block",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "block2",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "gethit-skill",
        param_id: 6,
        min: 35,
        max: 10
    }, {
        key: "randclassskill2",
        param_id: 7,
        max: 6
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invgtsu",
        invtransform: "dblu"
    },
    base: "Ward"
}, {
    id: 358,
    kind: "item.unique",
    key: "Kira's Guardian",
    base_code: "ci2",
    name: "Kira's Guardian",
    level: 85,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 120
    }, {
        key: "res-all",
        param_id: 2,
        min: 25,
        max: 40
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "balance2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "pierce-ltng",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "pierce-cold",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "pierce-fire",
        param_id: 7,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 77
    },
    image: {
        invfile: "invci2",
        invtransform: "blac"
    },
    base: "Tiara"
}, {
    id: 359,
    kind: "item.unique",
    key: "Ormus' Robes",
    base_code: "uui",
    name: "Ormus' Robes",
    level: 83,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 100,
        max: 200
    }, {
        key: "cast2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "extra-fire",
        param_id: 3,
        min: 10,
        max: 15
    }, {
        key: "extra-cold",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "extra-ltng",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "regen-mana",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "sorc-skill-rand-ctc",
        param_id: 7,
        param: 3,
        min: 12,
        max: 26
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invqlt",
        invtransform: "blac"
    },
    base: "Dusk Shroud"
}, {
    id: 360,
    kind: "item.unique",
    key: "Gheed's Fortune",
    base_code: "cm3",
    name: "Gheed's Fortune",
    level: 70,
    modifiers: [{
        key: "mag%",
        param_id: 1,
        min: 20,
        max: 40
    }, {
        key: "gold%",
        param_id: 2,
        min: 80,
        max: 160
    }, {
        key: "cheap",
        param_id: 3,
        min: 10,
        max: 15
    }],
    requirements: {
        level: 62
    },
    image: {
        invfile: "invsst",
        invtransform: ""
    },
    base: "Grand Charm"
}, {
    id: 361,
    kind: "item.unique",
    key: "Stormlash",
    base_code: "7fl",
    name: "Stormlash",
    level: 86,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 300,
        max: 340
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 3,
        min: 20,
        max: 25
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 30,
        max: 28
    }, {
        key: "dmg-ltng",
        param_id: 5,
        min: 1,
        max: 600
    }, {
        key: "light-thorns",
        param_id: 6,
        min: 200,
        max: 360
    }, {
        key: "crush",
        param_id: 7,
        min: 33,
        max: 33
    }, {
        key: "abs-ltng",
        param_id: 8,
        min: 3,
        max: 9
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 82
    },
    image: {
        invfile: "invfla",
        invtransform: "dgry"
    },
    base: "Scourge"
}, {
    id: 362,
    kind: "item.unique",
    key: "Halaberd's Reign",
    base_code: "bae",
    name: "Halaberd's Reign",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 140,
        max: 170
    }, {
        key: "skilltab",
        param_id: 2,
        param: 13,
        min: 2,
        max: 3
    }, {
        key: "bar",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "balance2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "red-dmg%",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "skill",
        param_id: 6,
        param: 149,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 146,
        min: 2,
        max: 3
    }, {
        key: "att/lvl",
        param_id: 8,
        param: 6
    }],
    requirements: {
        level: 77
    },
    image: {
        invfile: "invba4",
        invtransform: ""
    },
    base: "Conqueror Crown"
}, {
    id: 363,
    kind: "item.unique",
    key: "Warriv's Warder",
    base_code: "",
    name: "Warriv's Warder",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 364,
    kind: "item.unique",
    key: "Spike Thorn",
    base_code: "upk",
    name: "Spike Thorn",
    level: 78,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 150
    }, {
        key: "thorns/lvl",
        param_id: 2,
        param: 240
    }, {
        key: "dur",
        param_id: 3,
        min: 250,
        max: 250
    }, {
        key: "balance2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "red-dmg%",
        param_id: 5,
        min: 15,
        max: 25
    }, {
        key: "dmg-norm",
        param_id: 6,
        min: 50,
        max: 80
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invspku",
        invtransform: "dyel"
    },
    base: "Blade Barrier"
}, {
    id: 365,
    kind: "item.unique",
    key: "Dracul's Grasp",
    base_code: "uvg",
    name: "Dracul's Grasp",
    level: 84,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 120
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 8,
        max: 12
    }, {
        key: "openwounds",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "Deep-Wounds",
        param_id: 4,
        min: 240,
        max: 320
    }, {
        key: "heal-kill",
        param_id: 5,
        min: 5,
        max: 10
    }, {
        key: "str",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invvgl",
        invtransform: "dred"
    },
    base: "Vampirebone Gloves"
}, {
    id: 366,
    kind: "item.unique",
    key: "Frostwind",
    base_code: "7ls",
    name: "Frostwind",
    level: 78,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 220,
        max: 270
    }, {
        key: "freeze",
        param_id: 2,
        min: 4,
        max: 4
    }, {
        key: "half-freeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-cold",
        param_id: 4,
        param: 150,
        min: 237,
        max: 486
    }, {
        key: "swing2",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "aura",
        param_id: 6,
        min: 6,
        max: 6
    }, {
        key: "oskill",
        param_id: 7,
        param: 230,
        min: 2,
        max: 3
    }, {
        key: "coldskill",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invlsdu",
        invtransform: "cblu"
    },
    base: "Cryptic Sword"
}, {
    id: 367,
    kind: "item.unique",
    key: "Templar's Might",
    base_code: "uar",
    name: "Templar's Might",
    level: 82,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 170,
        max: 220
    }, {
        key: "balance2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac-miss",
        param_id: 3,
        min: 250,
        max: 300
    }, {
        key: "stam",
        param_id: 4,
        min: 40,
        max: 50
    }, {
        key: "str",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "vit",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "curse-effectiveness",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "aura",
        param_id: 8,
        param: 98,
        min: 6,
        max: 8
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "invaaru",
        invtransform: "cgrn"
    },
    base: "Sacred Armor"
}, {
    id: 368,
    kind: "item.unique",
    key: "Eschuta's temper",
    base_code: "obc",
    name: "Eschuta's Temper",
    level: 80,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 3
    }, {
        key: "cast2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "extra-fire",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "extra-ltng",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "enr",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "pierce-fire",
        param_id: 6,
        min: 5,
        max: 5
    }, {
        key: "pierce-ltng",
        param_id: 7,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "invob2",
        invtransform: ""
    },
    base: "Eldritch Orb"
}, {
    id: 369,
    kind: "item.unique",
    key: "Firelizard's Talons",
    base_code: "7lw",
    name: "Firelizard's Talons",
    level: 75,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 270
    }, {
        key: "swing2",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 236,
        max: 480
    }, {
        key: "res-fire",
        param_id: 4,
        min: 30,
        max: 50
    }, {
        key: "fireskill",
        param_id: 5,
        min: 3,
        max: 4
    }, {
        key: "pierce-fire",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "block-skill",
        param_id: 7,
        min: 25,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invclw",
        invtransform: ""
    },
    base: "Feral Claws"
}, {
    id: 370,
    kind: "item.unique",
    key: "Sandstorm Trek",
    base_code: "uvb",
    name: "Sandstorm Trek",
    level: 72,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 140,
        max: 170
    }, {
        key: "move2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "balance2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "res-pois-max",
        param_id: 4,
        min: 4,
        max: 4
    }, {
        key: "thorns",
        param_id: 5,
        min: 480,
        max: 540
    }, {
        key: "res-pois",
        param_id: 6,
        min: 30,
        max: 50
    }, {
        key: "rep-dur",
        param_id: 7,
        param: 10
    }, {
        key: "str",
        param_id: 8,
        min: 10,
        max: 15
    }, {
        key: "vit",
        param_id: 9,
        min: 10,
        max: 15
    }, {
        key: "stamdrain",
        param_id: 10,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invvbt",
        invtransform: ""
    },
    base: "Scarabshell Boots"
}, {
    id: 371,
    kind: "item.unique",
    key: "Marrowwalk",
    base_code: "umb",
    name: "Marrowwalk",
    level: 74,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 170,
        max: 200
    }, {
        key: "move2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "regen-stam",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "regen-mana",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "nofreeze",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "str",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "dex",
        param_id: 7,
        min: 17,
        max: 17
    }, {
        key: "skill",
        param_id: 8,
        param: 69,
        min: 1,
        max: 2
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invmbt",
        invtransform: ""
    },
    base: "Boneweave Boots"
}, {
    id: 372,
    kind: "item.unique",
    key: "Heaven's Light",
    base_code: "7sc",
    name: "Heaven's Light",
    level: 69,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 275,
        max: 325
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 33,
        max: 33
    }, {
        key: "light",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "demon-heal",
        param_id: 5,
        min: 15,
        max: 20
    }, {
        key: "crush",
        param_id: 6,
        min: 33,
        max: 33
    }, {
        key: "sock",
        param_id: 7,
        min: 2,
        max: 3
    }, {
        key: "pal",
        param_id: 8,
        min: 2,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invscp",
        invtransform: "cblu"
    },
    base: "Mighty Scepter"
}, {
    id: 373,
    kind: "item.unique",
    key: "Merman's Speed",
    base_code: "ulb",
    name: "Merman's Sprocket",
    level: 45,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 100
    }, {
        key: "move2",
        param_id: 2,
        min: 60,
        max: 60
    }, {
        key: "regen-mana",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "stam",
        param_id: 4,
        min: 50,
        max: 100
    }, {
        key: "stamdrain",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "cold-min",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "cold-max",
        param_id: 7,
        min: 80,
        max: 80
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "mermansprockets",
        invtransform: "lblu"
    },
    base: "Wyrmhide Boots"
}, {
    id: 374,
    kind: "item.unique",
    key: "Arachnid Mesh",
    base_code: "ulc",
    name: "Arachnid Mesh",
    level: 87,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 120
    }, {
        key: "cast2",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "charged",
        param_id: 3,
        min: 31,
        max: 3
    }, {
        key: "allskills",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "slow",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "mana%",
        param_id: 6,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invlbl",
        invtransform: "blac"
    },
    base: "Spiderweb Sash"
}, {
    id: 375,
    kind: "item.unique",
    key: "Nosferatu's Coil",
    base_code: "uvc",
    name: "Nosferatu's Coil",
    level: 68,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 10,
        max: 15
    }, {
        key: "mana-kill",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "slow",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 3,
        max: 6
    }, {
        key: "swing2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "deadly",
        param_id: 6,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 51
    },
    image: {
        invfile: "invvbl",
        invtransform: ""
    },
    base: "Vampirefang Belt"
}, {
    id: 376,
    kind: "item.unique",
    key: "Metalgrid",
    base_code: "amu",
    name: "Metalgrid",
    level: 85,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 750,
        max: 1e3
    }, {
        key: "res-all",
        param_id: 2,
        min: 25,
        max: 35
    }, {
        key: "att",
        param_id: 3,
        min: 400,
        max: 450
    }, {
        key: "oskill",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "charged",
        param_id: 5,
        min: 20,
        max: 12
    }, {
        key: "ac",
        param_id: 6,
        min: 300,
        max: 350
    }, {
        key: "oskill",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 81
    },
    image: {
        invfile: "invamu",
        invtransform: ""
    },
    base: "Amulet"
}, {
    id: 377,
    kind: "item.unique",
    key: "Verdugo's Hearty Cord",
    base_code: "umc",
    name: "Verdungo's Hearty Cord",
    level: 71,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 140
    }, {
        key: "vit",
        param_id: 2,
        min: 30,
        max: 40
    }, {
        key: "stam",
        param_id: 3,
        min: 100,
        max: 120
    }, {
        key: "balance2",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "red-dmg%",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "regen",
        param_id: 6,
        min: 10,
        max: 13
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invmbl",
        invtransform: "blac"
    },
    base: "Mithril Coil"
}, {
    id: 378,
    kind: "item.unique",
    key: "Sigurd's Staunch",
    base_code: "uhc",
    name: "Siggard's Stealth",
    level: 80,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 300,
        max: 400
    }, {
        key: "oskill",
        param_id: 2,
        min: 4,
        max: 6
    }, {
        key: "crush",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "rep-dur",
        param_id: 4,
        param: 25
    }, {
        key: "stamdrain",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "hp%",
        param_id: 6,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "invcolossus",
        invtransform: ""
    },
    base: "Colossus Girdle"
}, {
    id: 379,
    kind: "item.unique",
    key: "Carrion Wind",
    base_code: "rin",
    name: "Carrion Wind",
    level: 68,
    modifiers: [{
        key: "ac-miss",
        param_id: 1,
        min: 100,
        max: 160
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 6,
        max: 9
    }, {
        key: "res-pois",
        param_id: 3,
        min: 40,
        max: 55
    }, {
        key: "thorns",
        param_id: 4,
        min: 180,
        max: 300
    }, {
        key: "charged",
        param_id: 5,
        min: 35,
        max: 11
    }, {
        key: "hit-skill",
        param_id: 6,
        min: 8,
        max: 30
    }, {
        key: "move2",
        param_id: 7,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 60
    },
    image: {
        invfile: "invrin",
        invtransform: ""
    },
    base: "Ring"
}, {
    id: 380,
    kind: "item.unique",
    key: "Giantskull",
    base_code: "uh9",
    name: "Giant Skull",
    level: 73,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 250,
        max: 320
    }, {
        key: "str",
        param_id: 2,
        min: 25,
        max: 35
    }, {
        key: "crush",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "pierce",
        param_id: 4,
        min: 25,
        max: 35
    }, {
        key: "knock",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "dmg%",
        param_id: 6,
        min: 60,
        max: 80
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invbhm",
        invtransform: "lgry"
    },
    base: "Bone Visage"
}, {
    id: 381,
    kind: "item.unique",
    key: "Ironward",
    base_code: "7ws",
    name: "Astreon's Iron Ward",
    level: 68,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 290
    }, {
        key: "slow",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "att%",
        param_id: 3,
        min: 150,
        max: 200
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dmg-mag",
        param_id: 5,
        min: 160,
        max: 480
    }, {
        key: "red-dmg",
        param_id: 6,
        min: 4,
        max: 7
    }, {
        key: "dmg",
        param_id: 7,
        min: 100,
        max: 125
    }, {
        key: "skilltab",
        param_id: 8,
        param: 9,
        min: 3,
        max: 4
    }, {
        key: "crush",
        param_id: 9,
        min: 33,
        max: 33
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 60
    },
    image: {
        invfile: "invwsp",
        invtransform: "blac"
    },
    base: "Caduceus"
}, {
    id: 382,
    kind: "item.unique",
    key: "Annihilus",
    base_code: "cm1",
    name: "Annihilus",
    level: 130,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "vit",
        param_id: 2,
        min: 30,
        max: 60
    }, {
        key: "enr",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "addxp",
        param_id: 5,
        min: 5,
        max: 10
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invmss",
        invtransform: ""
    },
    base: "Small Charm"
}, {
    id: 383,
    kind: "item.unique",
    key: "Arioc's Needle",
    base_code: "7sr",
    name: "Arioc's Needle",
    level: 85,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 290
    }, {
        key: "Deep-Wounds",
        param_id: 2,
        min: 750,
        max: 750
    }, {
        key: "deadly",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "ignore-ac",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "allskills",
        param_id: 5,
        min: 4,
        max: 5
    }, {
        key: "swing2",
        param_id: 6,
        min: 30,
        max: 30
    }, {
        key: "openwounds",
        param_id: 7,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 81
    },
    image: {
        invfile: "invspr",
        invtransform: ""
    },
    base: "Hyperion Spear"
}, {
    id: 384,
    kind: "item.unique",
    key: "Cranebeak",
    base_code: "7mp",
    name: "Cranebeak",
    level: 71,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 300
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 1,
        max: 305
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "reduce-ac",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "mag%",
        param_id: 5,
        min: 30,
        max: 60
    }, {
        key: "skill",
        param_id: 6,
        param: 221,
        min: 4,
        max: 6
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invmpiu",
        invtransform: ""
    },
    base: "War Spike"
}, {
    id: 385,
    kind: "item.unique",
    key: "Nord's Tenderizer",
    base_code: "7cl",
    name: "Nord's Tenderizer",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 270,
        max: 330
    }, {
        key: "freeze",
        param_id: 2,
        min: 2,
        max: 4
    }, {
        key: "swing2",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 18,
        max: 32
    }, {
        key: "att%",
        param_id: 5,
        min: 150,
        max: 180
    }, {
        key: "abs-cold%",
        param_id: 6,
        min: 5,
        max: 15
    }, {
        key: "dmg-cold",
        param_id: 7,
        param: 125,
        min: 205,
        max: 455
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invclbu",
        invtransform: ""
    },
    base: "Truncheon"
}, {
    id: 386,
    kind: "item.unique",
    key: "Earthshifter",
    base_code: "7gm",
    name: "Earth Shifter",
    level: 77,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 300
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 25,
        max: 28
    }, {
        key: "crush",
        param_id: 3,
        min: 33,
        max: 33
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "kill-skill",
        param_id: 5,
        min: 10,
        max: 28
    }, {
        key: "fireskill",
        param_id: 6,
        min: 3,
        max: 4
    }, {
        key: "cast2",
        param_id: 7,
        min: 60,
        max: 60
    }, {
        key: "ease",
        param_id: 8,
        min: -25,
        max: -25
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invgma",
        invtransform: ""
    },
    base: "Thunder Maul"
}, {
    id: 387,
    kind: "item.unique",
    key: "Wraithflight",
    base_code: "7gl",
    name: "Wraith Flight",
    level: 84,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 190,
        max: 240
    }, {
        key: "pierce",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 6,
        max: 12
    }, {
        key: "mana-kill",
        param_id: 4,
        min: 5,
        max: 15
    }, {
        key: "dmg-mag",
        param_id: 5,
        min: 200,
        max: 300
    }, {
        key: "curse-effectiveness",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "ethereal",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invglv",
        invtransform: "dblu"
    },
    base: "Ghost Glaive"
}, {
    id: 388,
    kind: "item.unique",
    key: "Bonehew",
    base_code: "7o7",
    name: "Bonehew",
    level: 72,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 270,
        max: 320
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "charged",
        param_id: 3,
        min: 30,
        max: 14
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 50,
        max: 22
    }, {
        key: "noheal",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "sock",
        param_id: 6,
        min: 2,
        max: 4
    }, {
        key: "curse-effectiveness",
        param_id: 7,
        min: 10,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invbar",
        invtransform: "bwht"
    },
    base: "Ogre Axe"
}, {
    id: 389,
    kind: "item.unique",
    key: "Ondal's Wisdom",
    base_code: "6cs",
    name: "Ondal's Wisdom",
    level: 74,
    modifiers: [{
        key: "cast2",
        param_id: 1,
        min: 105,
        max: 105
    }, {
        key: "enr",
        param_id: 2,
        min: 40,
        max: 50
    }, {
        key: "allskills",
        param_id: 3,
        min: 3,
        max: 4
    }, {
        key: "ac",
        param_id: 4,
        min: 750,
        max: 950
    }, {
        key: "red-mag",
        param_id: 5,
        min: 10,
        max: 16
    }, {
        key: "cast-skill",
        param_id: 6,
        param: 8,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invcstu",
        invtransform: ""
    },
    base: "Elder Staff"
}, {
    id: 390,
    kind: "item.unique",
    key: "The Reedeemer",
    base_code: "7sc",
    name: "The Redeemer",
    level: 80,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 250,
        max: 300
    }, {
        key: "dmg-demon",
        param_id: 2,
        min: 200,
        max: 250
    }, {
        key: "pal",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "ease",
        param_id: 4,
        min: -60,
        max: -60
    }, {
        key: "skill",
        param_id: 5,
        param: 124,
        min: 2,
        max: 4
    }, {
        key: "skill",
        param_id: 6,
        param: 101,
        min: 2,
        max: 4
    }, {
        key: "light",
        param_id: 7,
        min: 3,
        max: 3
    }, {
        key: "reduce-ac",
        param_id: 8,
        min: 33,
        max: 33
    }, {
        key: "dmg",
        param_id: 9,
        min: 60,
        max: 120
    }, {
        key: "skill",
        param_id: 10,
        param: 119,
        min: 2,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "invscp",
        invtransform: ""
    },
    base: "Mighty Scepter"
}, {
    id: 391,
    kind: "item.unique",
    key: "Headhunter's Glory",
    base_code: "ush",
    name: "Head Hunter's Glory",
    level: 83,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 320,
        max: 420
    }, {
        key: "ac-miss",
        param_id: 2,
        min: 300,
        max: 350
    }, {
        key: "res-pois",
        param_id: 3,
        min: 30,
        max: 40
    }, {
        key: "sock",
        param_id: 4,
        min: 1,
        max: 3
    }, {
        key: "res-fire",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "heal-kill",
        param_id: 6,
        min: 5,
        max: 7
    }, {
        key: "hit-skill",
        param_id: 7,
        min: 12,
        max: 31
    }, {
        key: "curse-effectiveness",
        param_id: 8,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invbshu",
        invtransform: ""
    },
    base: "Troll Nest"
}, {
    id: 392,
    kind: "item.unique",
    key: "Steelrend",
    base_code: "uhg",
    name: "Steelrend",
    level: 78,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 170,
        max: 210
    }, {
        key: "str",
        param_id: 2,
        min: 15,
        max: 20
    }, {
        key: "dmg%",
        param_id: 3,
        min: 60,
        max: 80
    }, {
        key: "crush",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "thorns",
        param_id: 5,
        min: 250,
        max: 250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invhgl",
        invtransform: ""
    },
    base: "Ogre Gauntlets"
}, {
    id: 393,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-ltng",
        param_id: 1,
        min: 1,
        max: 74
    }, {
        key: "pierce-ltng",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-ltng",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "death-skill",
        param_id: 4,
        min: 100,
        max: 47
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 394,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 3,
        min: 24,
        max: 38
    }, {
        key: "pierce-cold",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-cold",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "death-skill",
        param_id: 4,
        min: 100,
        max: 37
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 395,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 17,
        max: 45
    }, {
        key: "pierce-fire",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-fire",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "death-skill",
        param_id: 4,
        min: 100,
        max: 31
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 396,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 50,
        min: 187,
        max: 187
    }, {
        key: "pierce-pois",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-pois",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "death-skill",
        param_id: 4,
        min: 100,
        max: 51
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 397,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-ltng",
        param_id: 1,
        min: 1,
        max: 74
    }, {
        key: "pierce-ltng",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-ltng",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "levelup-skill",
        param_id: 4,
        min: 100,
        max: 41
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 398,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 3,
        min: 24,
        max: 38
    }, {
        key: "pierce-cold",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-cold",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "levelup-skill",
        param_id: 4,
        min: 100,
        max: 43
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 399,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-fire",
        param_id: 1,
        min: 17,
        max: 45
    }, {
        key: "pierce-fire",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-fire",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "levelup-skill",
        param_id: 4,
        min: 100,
        max: 29
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 400,
    kind: "item.unique",
    key: "Rainbow Facet",
    base_code: "jew",
    name: "Rainbow Facet",
    level: 85,
    modifiers: [{
        key: "dmg-pois",
        param_id: 1,
        param: 50,
        min: 187,
        max: 187
    }, {
        key: "pierce-pois",
        param_id: 2,
        min: 3,
        max: 5
    }, {
        key: "extra-pois",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "levelup-skill",
        param_id: 4,
        min: 100,
        max: 23
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invgswe",
        invtransform: ""
    },
    base: "Jewel"
}, {
    id: 401,
    kind: "item.unique",
    key: "Hellfire Torch",
    base_code: "cm2",
    name: "Hellfire Torch",
    level: 120,
    modifiers: [{
        key: "randclassskill1",
        param_id: 1,
        max: 6
    }, {
        key: "vit",
        param_id: 2,
        min: 30,
        max: 60
    }, {
        key: "enr",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "light",
        param_id: 5,
        min: 4,
        max: 8
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "invtrch",
        invtransform: ""
    },
    base: "Large Charm"
}, {
    id: 402,
    kind: "item.unique",
    key: "Itheraels Path",
    base_code: "utb",
    name: "Itherael's Path",
    level: 131,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 40,
        max: 60
    }, {
        key: "cast2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "move2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "vit",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "balance2",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "dcloneboots",
        invtransform: ""
    },
    base: "Mirrored Boots"
}, {
    id: 403,
    kind: "item.unique",
    key: "Overlords Helm",
    base_code: "uhl",
    name: "Overlord's Helm",
    level: 131,
    modifiers: [{
        key: "pierce-phys",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 5,
        max: 8
    }, {
        key: "ac",
        param_id: 3,
        min: 460,
        max: 680
    }, {
        key: "str",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "curse-effectiveness",
        param_id: 5,
        min: -20,
        max: -20
    }, {
        key: "vit",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "dex",
        param_id: 7,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "dclonehelm",
        invtransform: ""
    },
    base: "Giant Conch"
}, {
    id: 404,
    kind: "item.unique",
    key: "Dark Abyss",
    base_code: "uth",
    name: "Dark Abyss",
    level: 131,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 150,
        max: 250
    }, {
        key: "heal-kill",
        param_id: 2,
        min: 4,
        max: 6
    }, {
        key: "mana-kill",
        param_id: 3,
        min: 4,
        max: 6
    }, {
        key: "res-cold",
        param_id: 4,
        min: 60,
        max: 60
    }, {
        key: "res-fire",
        param_id: 5,
        min: -30,
        max: -30
    }, {
        key: "cast2",
        param_id: 6,
        min: 50,
        max: 50
    }, {
        key: "allskills",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "ease",
        param_id: 8,
        min: -20,
        max: -20
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "dclonearmor",
        invtransform: ""
    },
    base: "Lacquered Plate"
}, {
    id: 405,
    kind: "item.unique",
    key: "Aidans Scar",
    base_code: "7qr",
    name: "Aidan's Scar",
    level: 131,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 440,
        max: 480
    }, {
        key: "swing2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "skilltab",
        param_id: 3,
        param: 19,
        min: 4,
        max: 4
    }, {
        key: "dmg-min",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "hit-skill",
        param_id: 6,
        param: 442,
        min: 25,
        max: 31
    }, {
        key: "vit",
        param_id: 7,
        min: -20,
        max: -30
    }, {
        key: "att/lvl",
        param_id: 8,
        param: 12
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "dcloneclaw",
        invtransform: ""
    },
    base: "Scissors Suwayyah"
}, {
    id: 406,
    kind: "item.unique",
    key: "Hadriels Hand",
    base_code: "7bs",
    name: "Hadriel's Hand",
    level: 131,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 450,
        max: 500
    }, {
        key: "swing2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 447,
        min: 25,
        max: 30
    }, {
        key: "dmg-fire",
        param_id: 4,
        min: 400,
        max: 750
    }, {
        key: "dex",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "indestruct",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "dmg-max",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 85
    },
    image: {
        invfile: "dclonesword",
        invtransform: ""
    },
    base: "Conquest Sword"
}, {
    id: 407,
    kind: "item.unique",
    key: "True Silver",
    base_code: "am5",
    name: "True Silver",
    level: 24,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 80,
        max: 120
    }, {
        key: "mag%",
        param_id: 2,
        min: 25,
        max: 45
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "crush",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "dmg/lvl",
        param_id: 5,
        param: 18
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "truesilver",
        invtransform: ""
    },
    base: "Maiden Javelin"
}, {
    id: 408,
    kind: "item.unique",
    key: "Quetzalcoatl",
    base_code: "dr2",
    name: "Quetzalcoatl",
    level: 35,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 50,
        max: 80
    }, {
        key: "dru",
        param_id: 2,
        min: 1,
        max: 2
    }, {
        key: "cast2",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "heal-kill",
        param_id: 4,
        min: 2,
        max: 4
    }, {
        key: "res-cold",
        param_id: 5,
        min: 10,
        max: 25
    }, {
        key: "gust-reduction",
        param_id: 6,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "Quetzalcoatl",
        invtransform: ""
    },
    base: "Hawk Helm"
}, {
    id: 409,
    kind: "item.unique",
    key: "Cyclopean Roar",
    base_code: "ba6",
    name: "Cyclopean Roar",
    level: 34,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 145
    }, {
        key: "leapspeed",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "move2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "hit-skill",
        param_id: 4,
        min: 8,
        max: 6
    }, {
        key: "skilltab",
        param_id: 5,
        param: 14,
        min: 2,
        max: 3
    }, {
        key: "crush",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "Cyclopean",
        invtransform: ""
    },
    base: "Jawbone Visor"
}, {
    id: 410,
    kind: "item.unique",
    key: "Sankekur's Fall",
    base_code: "pa3",
    name: "Sankekur's Fall",
    level: 37,
    modifiers: [{
        key: "dmg-cold",
        param_id: 1,
        param: 150,
        min: 55,
        max: 90
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 40,
        max: 120
    }, {
        key: "dmg-ltng",
        param_id: 3,
        min: 1,
        max: 185
    }, {
        key: "ac%",
        param_id: 4,
        min: 120,
        max: 165
    }, {
        key: "red-mag",
        param_id: 5,
        min: 2,
        max: 5
    }, {
        key: "ignore-ac",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "heal-kill",
        param_id: 7,
        min: 2,
        max: 4
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "Sankekur",
        invtransform: ""
    },
    base: "Heraldic Shield"
}, {
    id: 411,
    kind: "item.unique",
    key: "Mage Slayer",
    base_code: "9ar",
    name: "Mage Slayer",
    level: 32,
    modifiers: [{
        key: "dmg%/lvl",
        param_id: 1,
        param: 20
    }, {
        key: "skill",
        param_id: 2,
        param: 275,
        min: 2,
        max: 2
    }, {
        key: "balance2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dmg-norm",
        param_id: 4,
        min: 10,
        max: 25
    }, {
        key: "str",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "light",
        param_id: 6,
        min: 6,
        max: 6
    }, {
        key: "red-dmg%",
        param_id: 7,
        min: 10,
        max: 15
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "mageslayer",
        invtransform: ""
    },
    base: "Quhab"
}, {
    id: 412,
    kind: "item.unique",
    key: "Kalans Legacy",
    base_code: "ne6",
    name: "Kalan's Legacy",
    level: 30,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ac",
        param_id: 2,
        min: 40,
        max: 75
    }, {
        key: "block2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "block",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "sock",
        param_id: 5,
        min: 1,
        max: 2
    }, {
        key: "aura",
        param_id: 6,
        param: 115,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 26
    },
    image: {
        invfile: "kalans",
        invtransform: ""
    },
    base: "Mummified Trophy"
}, {
    id: 413,
    kind: "item.unique",
    key: "Tempest",
    base_code: "ob6",
    name: "Tempest",
    level: 28,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 2
    }, {
        key: "gethit-skill",
        param_id: 2,
        param: 44,
        min: 8,
        max: 12
    }, {
        key: "mana",
        param_id: 3,
        min: 100,
        max: 145
    }, {
        key: "cast2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "regen-mana",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "mana%",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "equipped-skill",
        param_id: 7,
        min: 16,
        max: 16
    }, {
        key: "es-efficiency",
        param_id: 8,
        min: 16,
        max: 16
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "sorcorb",
        invtransform: ""
    },
    base: "Glowing Orb"
}, {
    id: 414,
    kind: "item.unique",
    key: "Dclone Trophy",
    base_code: "cm1",
    name: "Diablo Clone Trophy Season 4 Enlightenment",
    level: 130,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "state",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dclone-clout",
        param_id: 3,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 1
    },
    image: {
        invfile: "invflag",
        invtransform: ""
    },
    base: "Small Charm"
}, {
    id: 415,
    kind: "item.unique",
    key: "Maxlevel Trophy",
    base_code: "cm1",
    name: "Level 99 Trophy Season 4 Enlightenment",
    level: 130,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "state",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "maxlevel-clout",
        param_id: 3,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 1
    },
    image: {
        invfile: "invflag",
        invtransform: ""
    },
    base: "Small Charm"
}, {
    id: 416,
    kind: "item.unique",
    key: "Dev Charm",
    base_code: "cm1",
    name: "Developers Bag Of Tricks",
    level: 130,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "state",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dev-clout",
        param_id: 3,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 1
    },
    image: {
        invfile: "devcharm",
        invtransform: ""
    },
    base: "Small Charm"
}, {
    id: 417,
    kind: "item.unique",
    key: "Band of Skulls",
    base_code: "rbe",
    name: "Band of Skulls",
    level: 131,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 100,
        max: 150
    }, {
        key: "gethit-skill",
        param_id: 2,
        min: 6,
        max: 28
    }, {
        key: "mag%",
        param_id: 3,
        min: 25,
        max: 30
    }, {
        key: "red-dmg%",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "sock",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "light",
        param_id: 6,
        min: -4,
        max: -4
    }],
    requirements: {
        level: 90
    },
    image: {
        invfile: "invbsk",
        invtransform: ""
    }
}, {
    id: 418,
    kind: "item.unique",
    key: "Cage of the Unsullied",
    base_code: "rar",
    name: "Cage of the Unsullied",
    level: 131,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 200,
        max: 300
    }, {
        key: "res-all",
        param_id: 2,
        min: 15,
        max: 20
    }, {
        key: "light",
        param_id: 3,
        min: -4,
        max: -8
    }, {
        key: "sock",
        param_id: 4,
        min: 6,
        max: 6
    }],
    requirements: {
        level: 90
    },
    image: {
        invfile: "invuns",
        invtransform: ""
    }
}, {
    id: 419,
    kind: "item.unique",
    key: "The Third Eye",
    base_code: "ram",
    name: "The Third Eye",
    level: 131,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "cast2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "light",
        param_id: 4,
        min: -4,
        max: -4
    }, {
        key: "cast-skill",
        param_id: 5,
        min: 12,
        max: 25
    }, {
        key: "enr",
        param_id: 6,
        min: 40,
        max: 50
    }, {
        key: "sock",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "socketed-text",
        param_id: 8,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 90
    },
    image: {
        invfile: "invamu",
        invtransform: "oran"
    }
}, {
    id: 420,
    kind: "item.unique",
    key: "Magefist",
    base_code: "tgl",
    name: "Magefist",
    level: 31,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 10,
        max: 25
    }, {
        key: "poisskill",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 75,
        min: 204,
        max: 204
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgry"
    },
    base: "Light Gauntlets"
}, {
    id: 421,
    kind: "item.unique",
    key: "Magefist",
    base_code: "tgl",
    name: "Magefist",
    level: 31,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 10,
        max: 25
    }, {
        key: "ltngskill",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-ltng",
        param_id: 4,
        min: 1,
        max: 45
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgry"
    },
    base: "Light Gauntlets"
}, {
    id: 422,
    kind: "item.unique",
    key: "Magefist",
    base_code: "tgl",
    name: "Magefist",
    level: 31,
    modifiers: [{
        key: "cast3",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 10,
        max: 25
    }, {
        key: "coldskill",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "dmg-cold",
        param_id: 4,
        min: 10,
        max: 18
    }, {
        key: "ac",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 6,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 23
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgry"
    },
    base: "Light Gauntlets"
}, {
    id: 423,
    kind: "item.unique",
    key: "Rathma Trophy",
    base_code: "cm1",
    name: "Rathma Trophy Season 4 Enlightenment",
    level: 130,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "state",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "rathma-clout",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "state",
        param_id: 4,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 1
    },
    image: {
        invfile: "invflag",
        invtransform: ""
    },
    base: "Small Charm"
}, {
    id: 424,
    kind: "item.unique",
    key: "Zeraes Resolve",
    base_code: "ame",
    name: "Zerae's Resolve",
    level: 87,
    modifiers: [{
        key: "ama",
        param_id: 1,
        min: 3,
        max: 4
    }, {
        key: "joust-reduction-zeraes",
        param_id: 2,
        min: 38,
        max: 38
    }, {
        key: "dmg%",
        param_id: 3,
        min: 270,
        max: 315
    }, {
        key: "swing2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "oskill",
        param_id: 5,
        min: 6,
        max: 8
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 40,
        max: 60
    }, {
        key: "red-mag",
        param_id: 7,
        min: 14,
        max: 14
    }, {
        key: "skilltab",
        param_id: 8,
        param: 1,
        min: 3,
        max: 3
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "zeraeresolve",
        invtransform: ""
    },
    base: "Matriarchal Pike"
}, {
    id: 425,
    kind: "item.unique",
    key: "Occultist",
    base_code: "utg",
    name: "Occultist",
    level: 87,
    modifiers: [{
        key: "stupidity",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "curse-res",
        param_id: 2,
        min: 25,
        max: 35
    }, {
        key: "mana%",
        param_id: 3,
        min: 25,
        max: 35
    }, {
        key: "cast2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "ac%",
        param_id: 5,
        min: 80,
        max: 100
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "occultist",
        invtransform: ""
    },
    base: "Crusader Gauntlets"
}, {
    id: 426,
    kind: "item.unique",
    key: "Brimstone Rain",
    base_code: "6bs",
    name: "Brimstone Rain",
    level: 87,
    modifiers: [{
        key: "cast2",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "res-fire",
        param_id: 2,
        min: 50,
        max: 75
    }, {
        key: "allskills",
        param_id: 3,
        min: 3,
        max: 4
    }, {
        key: "hp",
        param_id: 4,
        min: 50,
        max: 100
    }, {
        key: "skill",
        param_id: 5,
        param: 56,
        min: 3,
        max: 3
    }, {
        key: "cast-skill",
        param_id: 6,
        param: 56,
        min: 18,
        max: 35
    }, {
        key: "skill",
        param_id: 7,
        param: 61,
        min: 3,
        max: 3
    }, {
        key: "pierce-phys",
        param_id: 8,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "brimstonerain",
        invtransform: ""
    },
    base: "Shillelagh"
}, {
    id: 427,
    kind: "item.unique",
    key: "Akarats Devotion",
    base_code: "7qs",
    name: "Akarat's Devotion",
    level: 87,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 2,
        min: 240,
        max: 270
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "skill",
        param_id: 4,
        param: 112,
        min: 3,
        max: 4
    }, {
        key: "mag%",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "regen",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "cast-skill",
        param_id: 7,
        param: 112,
        min: 25,
        max: 35
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "akaratdevotion",
        invtransform: ""
    },
    base: "Seraph Rod"
}, {
    id: 428,
    kind: "item.unique",
    key: "Martyr",
    base_code: "ned",
    name: "Martyrdom",
    level: 87,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 3
    }, {
        key: "ac%",
        param_id: 2,
        min: 160,
        max: 200
    }, {
        key: "balance2",
        param_id: 3,
        min: 35,
        max: 35
    }, {
        key: "curse-effectiveness",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "skill",
        param_id: 5,
        param: 73,
        min: 2,
        max: 2
    }, {
        key: "dmg-pois",
        param_id: 6,
        param: 50,
        min: 1538,
        max: 1793
    }, {
        key: "red-mag",
        param_id: 7,
        min: 18,
        max: 24
    }, {
        key: "hit-skill",
        param_id: 8,
        param: 68,
        min: 15,
        max: 35
    }, {
        key: "block",
        param_id: 9,
        min: 35,
        max: 35
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "martyrdom",
        invtransform: ""
    },
    base: "Overseer Skull"
}, {
    id: 429,
    kind: "item.unique",
    key: "Stalkers Cull",
    base_code: "7tw",
    name: "Stalker's Cull",
    level: 87,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 280
    }, {
        key: "skilltab",
        param_id: 2,
        param: 19,
        min: 3,
        max: 4
    }, {
        key: "kick",
        param_id: 3,
        min: 30,
        max: 40
    }, {
        key: "deadly",
        param_id: 4,
        min: 20,
        max: 30
    }, {
        key: "skill",
        param_id: 5,
        param: 275,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 6,
        param: 254,
        min: 4,
        max: 4
    }, {
        key: "dragonflight-reduction",
        param_id: 7,
        min: 13,
        max: 13
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "stalkerscull",
        invtransform: ""
    },
    base: "Runic Talons"
}, {
    id: 430,
    kind: "item.unique",
    key: "Purgatory",
    base_code: "utp",
    name: "Purgatory",
    level: 87,
    modifiers: [{
        key: "block",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "block2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "red-mag",
        param_id: 3,
        min: 16,
        max: 24
    }, {
        key: "dmg%/eth",
        param_id: 4,
        min: 60,
        max: 60
    }, {
        key: "mag%",
        param_id: 5,
        min: 40,
        max: 65
    }, {
        key: "rep-dur",
        param_id: 6,
        param: 25
    }, {
        key: "ac%",
        param_id: 7,
        min: 220,
        max: 260
    }],
    requirements: {
        level: 75
    },
    image: {
        invfile: "purgatory",
        invtransform: ""
    },
    base: "Archon Plate"
}, {
    id: 431,
    kind: "item.unique",
    key: "Raekors Virtue",
    base_code: "baf",
    name: "Raekor's Virtue",
    level: 87,
    modifiers: [{
        key: "bar",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 2,
        param: 140,
        min: 2,
        max: 3
    }, {
        key: "ac%",
        param_id: 3,
        min: 140,
        max: 180
    }, {
        key: "skill",
        param_id: 4,
        param: 133,
        min: 2,
        max: 3
    }, {
        key: "manasteal",
        param_id: 5,
        min: 5,
        max: 8
    }, {
        key: "dex",
        param_id: 6,
        min: 20,
        max: 30
    }, {
        key: "maxcurse",
        param_id: 7,
        min: 1,
        max: 1
    }, {
        key: "curse-effectiveness",
        param_id: 8,
        min: 25,
        max: 25
    }, {
        key: "dmg%",
        param_id: 9,
        min: 40,
        max: 60
    }],
    requirements: {
        level: 78
    },
    image: {
        invfile: "raekorsvirtue",
        invtransform: ""
    },
    base: "Guardian Crown"
}, {
    id: 432,
    kind: "item.unique",
    key: "Nightmares Feast",
    base_code: "drf",
    name: "Ursa's Nightmare",
    level: 50,
    modifiers: [{
        key: "noheal",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "skilltab",
        param_id: 2,
        param: 16,
        min: 2,
        max: 4
    }, {
        key: "ac%",
        param_id: 3,
        min: 130,
        max: 160
    }, {
        key: "balance2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "hp%",
        param_id: 5,
        min: 30,
        max: 35
    }, {
        key: "regen",
        param_id: 6,
        min: -30,
        max: -30
    }, {
        key: "splash%/missinghp%",
        param_id: 7,
        min: 2,
        max: 2
    }, {
        key: "lifesteal-cap",
        param_id: 8,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "nightmarefeast",
        invtransform: ""
    },
    base: "Dream Spirit"
}, {
    id: 433,
    kind: "item.unique",
    key: "Zhar the Mad Map",
    base_code: "t51",
    name: "Zhar's Sanctum",
    level: 80,
    modifiers: [{
        key: "map-glob-density",
        param_id: 1,
        min: 125,
        max: 175
    }, {
        key: "map-play-addxp",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "map-play-mag-gold%",
        param_id: 3,
        min: 50,
        max: 100
    }, {
        key: "map-mon-dropcharms",
        param_id: 4,
        min: 4,
        max: 6
    }, {
        key: "map-mon-hp%",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "map-mon-phys-as-extra-pois",
        param_id: 6,
        param: 125,
        min: 50,
        max: 100
    }, {
        key: "map-play-res-all",
        param_id: 7,
        min: -10,
        max: -10
    }, {
        key: "map-play-regen",
        param_id: 8,
        min: -100,
        max: -50
    }, {
        key: "map-play-balance1",
        param_id: 9,
        min: -30,
        max: -20
    }, {
        key: "map-glob-boss-dropskillers",
        param_id: 10,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invmapzhar",
        invtransform: ""
    },
    base: "Map"
}, {
    id: 434,
    kind: "item.unique",
    key: "Warlord of Blood Map",
    base_code: "t52",
    name: "Warlord of Blood",
    level: 80,
    modifiers: [{
        key: "map-glob-density",
        param_id: 1,
        min: 125,
        max: 175
    }, {
        key: "map-play-addxp",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "map-play-mag-gold%",
        param_id: 3,
        min: 25,
        max: 50
    }, {
        key: "map-glob-dropcorrupted",
        param_id: 4,
        min: 100,
        max: 100
    }, {
        key: "map-mon-hp%",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "map-mon-phys-as-extra-fire",
        param_id: 6,
        min: 50,
        max: 100
    }, {
        key: "map-mon-velocity%",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "map-mon-crush",
        param_id: 8,
        min: 5,
        max: 10
    }, {
        key: "map-play-block",
        param_id: 9,
        min: -10,
        max: -5
    }, {
        key: "map-glob-boss-dropcorruptedunique",
        param_id: 10,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invmaphellcaves",
        invtransform: ""
    },
    base: "Map"
}, {
    id: 435,
    kind: "item.unique",
    key: "Akarats Devotion",
    base_code: "7qs",
    name: "Akarat's Devotion",
    level: 87,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "dmg%",
        param_id: 2,
        min: 240,
        max: 270
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "skill",
        param_id: 4,
        param: 112,
        min: 3,
        max: 4
    }, {
        key: "mag%",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "regen",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "hit-skill",
        param_id: 7,
        param: 112,
        min: 25,
        max: 35
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "akaratdevotion",
        invtransform: ""
    },
    base: "Seraph Rod"
}, {
    id: 436,
    kind: "item.unique",
    key: "Cyclopean Roar",
    base_code: "ba6",
    name: "Cyclopean Roar",
    level: 34,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 90,
        max: 145
    }, {
        key: "leapspeed",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "move2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "cast-skill",
        param_id: 4,
        min: 8,
        max: 6
    }, {
        key: "skilltab",
        param_id: 5,
        param: 14,
        min: 2,
        max: 3
    }, {
        key: "crush",
        param_id: 6,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "Cyclopean",
        invtransform: ""
    },
    base: "Jawbone Visor"
}, {
    id: 437,
    kind: "item.unique",
    key: "Fallen Gardens Map",
    base_code: "t53",
    name: "Fallen Gardens",
    level: 80,
    modifiers: [{
        key: "map-glob-density",
        param_id: 1,
        min: 125,
        max: 175
    }, {
        key: "map-play-addxp",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "map-play-mag-gold%",
        param_id: 3,
        min: 100,
        max: 200
    }, {
        key: "map-mon-dropjewels",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "map-mon-hp%",
        param_id: 5,
        min: 10,
        max: 30
    }, {
        key: "map-mon-phys-as-extra-ltng",
        param_id: 6,
        min: 50,
        max: 100
    }, {
        key: "map-mon-deadlystrike",
        param_id: 7,
        min: 10,
        max: 20
    }, {
        key: "map-mon-regen",
        param_id: 8,
        min: 50,
        max: 100
    }, {
        key: "map-glob-boss-dropfacet",
        param_id: 9,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invmapfallengardens",
        invtransform: ""
    },
    base: "Map"
}, {
    id: 438,
    kind: "item.unique",
    key: "Uldyssian's Awakening",
    base_code: "7st",
    name: "Uldyssian's Awakening",
    level: 80,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 270
    }, {
        key: "mindmg/energy",
        param_id: 2,
        min: 8,
        max: 8
    }, {
        key: "equipped-skill",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "swing2",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "manasteal",
        param_id: 5,
        min: 10,
        max: 14
    }, {
        key: "mana/lvl",
        param_id: 6,
        min: 60,
        max: 60
    }, {
        key: "mana%",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "light",
        param_id: 8,
        min: 8,
        max: 8
    }, {
        key: "es-efficiency",
        param_id: 9,
        min: 20,
        max: 20
    }, {
        key: "ama",
        param_id: 10,
        min: 3,
        max: 4
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 74
    },
    image: {
        invfile: "invuldyssian",
        invtransform: ""
    },
    base: "Ghost Spear"
}, {
    id: 439,
    kind: "item.unique",
    key: "Leoric's Mithril Blade",
    base_code: "7cm",
    name: "Leoric's Mithril Bane",
    level: 78,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 3,
        max: 4
    }, {
        key: "dmg%",
        param_id: 2,
        min: 260,
        max: 320
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "joust-reduction",
        param_id: 4,
        min: 13,
        max: 13
    }, {
        key: "crush",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "reanimate",
        param_id: 6,
        param: 440,
        min: 8,
        max: 8
    }, {
        key: "lifesteal",
        param_id: 7,
        min: 6,
        max: 10
    }, {
        key: "dmg-und/lvl",
        param_id: 8,
        param: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 72
    },
    image: {
        invfile: "invhighlander",
        invtransform: ""
    },
    base: "Highland Blade"
}, {
    id: 440,
    kind: "item.unique",
    key: "Mirror Shield",
    base_code: "urg",
    name: "Twilight's Reflection",
    level: 18,
    modifiers: [{
        key: "block-skill",
        param_id: 1,
        min: 6,
        max: 14
    }, {
        key: "curse-effectiveness",
        param_id: 2,
        min: 20,
        max: 30
    }, {
        key: "curse-res",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 35,
        max: 35
    }, {
        key: "ac%",
        param_id: 5,
        min: 140,
        max: 180
    }, {
        key: "block",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "pierce-phys",
        param_id: 7,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invmirrorshield",
        invtransform: ""
    },
    base: "Hyperion"
}, {
    id: 441,
    kind: "item.unique",
    key: "Wraithskin",
    base_code: "ung",
    name: "Wraithskin",
    level: 61,
    modifiers: [{
        key: "curse-effectiveness",
        param_id: 1,
        min: 40,
        max: 50
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "hp%",
        param_id: 3,
        min: -5,
        max: -5
    }, {
        key: "max-deadly",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "ac%",
        param_id: 5,
        min: 130,
        max: 130
    }, {
        key: "dmg%",
        param_id: 6,
        min: 60,
        max: 100
    }, {
        key: "heal-kill",
        param_id: 7,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 53
    },
    image: {
        invfile: "invdiamondmail",
        invtransform: ""
    },
    base: "Diamond Mail"
}, {
    id: 442,
    kind: "item.unique",
    key: "Titangrip",
    base_code: "ulg",
    name: "Titan's Grip",
    level: 45,
    modifiers: [{
        key: "block",
        param_id: 1,
        min: 15,
        max: 20
    }, {
        key: "ac%",
        param_id: 2,
        min: 140,
        max: 185
    }, {
        key: "block2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 25,
        max: 35
    }, {
        key: "half-freeze",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "ac-miss",
        param_id: 6,
        min: 120,
        max: 120
    }],
    requirements: {
        level: 38
    },
    image: {
        invfile: "invbramble",
        invtransform: ""
    },
    base: "Bramble Mitts"
}, {
    id: 443,
    kind: "item.unique",
    key: "Shatterblade",
    base_code: "7di",
    name: "Shatterblade",
    level: 73,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 240,
        max: 280
    }, {
        key: "dmg-ac",
        param_id: 2,
        min: -100,
        max: -100
    }, {
        key: "coldskill",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "dmg-min",
        param_id: 4,
        min: 25,
        max: 25
    }, {
        key: "kill-skill",
        param_id: 5,
        min: 16,
        max: 28
    }, {
        key: "freeze",
        param_id: 6,
        min: 2,
        max: 2
    }, {
        key: "pierce-cold",
        param_id: 7,
        min: 15,
        max: 25
    }, {
        key: "hit-skill",
        param_id: 8,
        min: 22,
        max: 33
    }, {
        key: "deadly",
        param_id: 11,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invshatterblade",
        invtransform: ""
    },
    base: "Mithril Point"
}, {
    id: 444,
    kind: "item.unique",
    key: "Denmother",
    base_code: "drc",
    name: "Denmother",
    level: 66,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 125,
        max: 125
    }, {
        key: "dru",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "cast2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "gold%",
        param_id: 4,
        min: 50,
        max: 80
    }, {
        key: "skill",
        param_id: 5,
        param: 247,
        min: 2,
        max: 3
    }, {
        key: "sock",
        param_id: 6,
        min: 2,
        max: 3
    }, {
        key: "regen",
        param_id: 7,
        min: 25,
        max: 35
    }, {
        key: "extra-grizzly",
        param_id: 8,
        min: 2,
        max: 2
    }, {
        key: "no-wolves",
        param_id: 9,
        min: 10,
        max: 10
    }, {
        key: "skill",
        param_id: 10,
        param: 233,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 58
    },
    image: {
        invfile: "invdenmother",
        invtransform: ""
    },
    base: "Sun Spirit"
}, {
    id: 445,
    kind: "item.unique",
    key: "Ebonbane",
    base_code: "amc",
    name: "Ebonbane",
    level: 70,
    modifiers: [{
        key: "skill",
        param_id: 1,
        param: 29,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 2,
        param: 13,
        min: 2,
        max: 3
    }, {
        key: "maxcurse",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "move2",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "swing2",
        param_id: 5,
        min: 60,
        max: 60
    }, {
        key: "dmg%",
        param_id: 6,
        min: 275,
        max: 350
    }, {
        key: "skilltab",
        param_id: 7,
        param: 1,
        min: 4,
        max: 5
    }, {
        key: "hit-skill",
        param_id: 8,
        min: 12,
        max: 16
    }, {
        key: "skill",
        param_id: 9,
        param: 6,
        min: 4,
        max: 5
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invebonbane",
        invtransform: ""
    },
    base: "Grand Matron Bow"
}, {
    id: 446,
    kind: "item.unique",
    key: "Whispering Mirage",
    base_code: "7xf",
    name: "Whispering Mirage",
    level: 76,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 180,
        max: 240
    }, {
        key: "skill",
        param_id: 2,
        param: 268,
        min: 1,
        max: 2
    }, {
        key: "skill",
        param_id: 3,
        param: 279,
        min: 1,
        max: 2
    }, {
        key: "ass",
        param_id: 4,
        min: 2,
        max: 2
    }, {
        key: "cast2",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "extra-shadow",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "pierce-phys",
        param_id: 7,
        min: 5,
        max: 8
    }, {
        key: "dmg-undead",
        param_id: 8,
        min: 200,
        max: 250
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invshadowfist",
        invtransform: ""
    },
    base: "War Fist"
}, {
    id: 447,
    kind: "item.unique",
    key: "Skywarden",
    base_code: "paf",
    name: "Skywarden",
    level: 85,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 135,
        max: 170
    }, {
        key: "block",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "block-skill",
        param_id: 3,
        min: 16,
        max: 35
    }, {
        key: "skilltab",
        param_id: 4,
        param: 10,
        min: 2,
        max: 2
    }, {
        key: "pal",
        param_id: 5,
        min: 1,
        max: 2
    }, {
        key: "crush",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 7,
        min: 15,
        max: 25
    }, {
        key: "res-cold",
        param_id: 8,
        min: 75,
        max: 75
    }, {
        key: "res-ltng",
        param_id: 9,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 77
    },
    image: {
        invfile: "invsunshield",
        invtransform: ""
    },
    base: "Vortex Shield"
}, {
    id: 448,
    kind: "item.unique",
    key: "Skorn",
    base_code: "ob7",
    name: "Skorn",
    level: 36,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 18,
        max: 18
    }, {
        key: "inc-splash-radius",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "skilltab",
        param_id: 4,
        param: 3,
        min: 2,
        max: 3
    }, {
        key: "swing2",
        param_id: 5,
        min: 20,
        max: 20
    }, {
        key: "crush",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "block",
        param_id: 7,
        min: 30,
        max: 40
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 27
    },
    image: {
        invfile: "invorbmelee",
        invtransform: ""
    },
    base: "Crystalline Globe"
}, {
    id: 449,
    kind: "item.unique",
    key: "Achilles Strike",
    base_code: "9b8",
    name: "Achilles Strike",
    level: 59,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 80,
        max: 80
    }, {
        key: "dmg-fire",
        param_id: 3,
        min: 200,
        max: 450
    }, {
        key: "sock",
        param_id: 4,
        min: 2,
        max: 3
    }, {
        key: "skilltab",
        param_id: 5,
        param: 12,
        min: 2,
        max: 3
    }, {
        key: "slow",
        param_id: 6,
        min: 30,
        max: 40
    }, {
        key: "str",
        param_id: 7,
        min: 20,
        max: 30
    }, {
        key: "skill",
        param_id: 8,
        param: 147,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 9,
        param: 152,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 51
    },
    image: {
        invfile: "invhellrunicaxe",
        invtransform: ""
    },
    base: "Hurlbat"
}, {
    id: 450,
    kind: "item.unique",
    key: "Wildspeaker",
    base_code: "ba7",
    name: "Wildspeaker",
    level: 52,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 160,
        max: 240
    }, {
        key: "bar",
        param_id: 2,
        min: 1,
        max: 2
    }, {
        key: "mana%",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "cast2",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 5,
        min: 33,
        max: 33
    }, {
        key: "skill",
        param_id: 6,
        param: 138,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 150,
        min: 2,
        max: 3
    }, {
        key: "res-fire",
        param_id: 8,
        min: 50,
        max: 50
    }, {
        key: "vit",
        param_id: 9,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invbarbcast",
        invtransform: ""
    },
    base: "Lion Helm"
}, {
    id: 451,
    kind: "item.unique",
    key: "Fenris",
    base_code: "dr6",
    name: "Fenris",
    level: 48,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 160,
        max: 220
    }, {
        key: "dru",
        param_id: 2,
        min: 1,
        max: 2
    }, {
        key: "extra-spiritwolf",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 4,
        param: 227,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 5,
        param: 236,
        min: 2,
        max: 2
    }, {
        key: "reduce-ac",
        param_id: 6,
        min: 25,
        max: 25
    }, {
        key: "pierce-phys",
        param_id: 7,
        min: 5,
        max: 10
    }, {
        key: "dex",
        param_id: 8,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 40
    },
    image: {
        invfile: "invwolfboss",
        invtransform: ""
    },
    base: "Alpha Helm"
}, {
    id: 452,
    kind: "item.unique",
    key: "Sacred Totem",
    base_code: "neg",
    name: "Sacred Totem",
    level: 72,
    modifiers: [{
        key: "nec",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "ac%",
        param_id: 2,
        min: 150,
        max: 175
    }, {
        key: "skill",
        param_id: 3,
        param: 66,
        min: 2,
        max: 3
    }, {
        key: "gethit-skill",
        param_id: 4,
        min: 66,
        max: 50
    }, {
        key: "res-ltng",
        param_id: 5,
        min: 45,
        max: 45
    }, {
        key: "extra-revives",
        param_id: 6,
        min: 4,
        max: 4
    }, {
        key: "reanimate",
        param_id: 7,
        param: 19,
        min: 4,
        max: 6
    }, {
        key: "reanimate",
        param_id: 8,
        param: 58,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 9,
        param: 91,
        min: 2,
        max: 3
    }],
    requirements: {
        level: 64
    },
    image: {
        invfile: "invgoblinhead",
        invtransform: ""
    },
    base: "Hellspawn Skull"
}, {
    id: 453,
    kind: "item.unique",
    key: "Imperial Palace Map",
    base_code: "t54",
    name: "Imperial Palace Map",
    level: 80,
    modifiers: [{
        key: "map-glob-density",
        param_id: 1,
        min: 200,
        max: 225
    }, {
        key: "map-play-addxp",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "map-play-mag-gold%",
        param_id: 3,
        min: 100,
        max: 150
    }, {
        key: "map-mon-hp%",
        param_id: 4,
        min: 15,
        max: 25
    }, {
        key: "map-glob-monsterrarity",
        param_id: 5,
        min: 50,
        max: 50
    }, {
        key: "map-mon-phys-as-extra-mag",
        param_id: 6,
        min: 10,
        max: 15
    }, {
        key: "map-mon-curseresist-hp%",
        param_id: 7,
        min: 50,
        max: 50
    }, {
        key: "map-play-ac%",
        param_id: 8,
        min: -40,
        max: -50
    }, {
        key: "map-glob-arealevel",
        param_id: 9,
        min: 1,
        max: 1
    }, {
        key: "map-mon-deadlystrike",
        param_id: 10,
        min: 4,
        max: 6
    }, {
        key: "map-glob-boss-droppuzzlebox",
        param_id: 11,
        min: 1,
        max: 1
    }, {
        key: "map-glob-add-mon-fetish",
        param_id: 12,
        min: 785,
        max: 785
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invmap_imppalace",
        invtransform: ""
    }
}, {
    id: 454,
    kind: "item.unique",
    key: "Outer Void Map",
    base_code: "t55",
    name: "Outer Void Map",
    level: 80,
    modifiers: [{
        key: "map-glob-density",
        param_id: 1,
        min: 80,
        max: 100
    }, {
        key: "map-play-addxp",
        param_id: 2,
        min: 30,
        max: 40
    }, {
        key: "map-play-mag-gold%",
        param_id: 3,
        min: 200,
        max: 300
    }, {
        key: "map-mon-phys-as-extra-pois",
        param_id: 4,
        param: 125,
        min: 20,
        max: 30
    }, {
        key: "map-mon-phys-as-extra-cold",
        param_id: 5,
        param: 25,
        min: 20,
        max: 30
    }, {
        key: "map-play-speed-all",
        param_id: 6,
        min: 40,
        max: 60
    }, {
        key: "map-play-ac%",
        param_id: 7,
        min: -50,
        max: -50
    }, {
        key: "map-mon-regen",
        param_id: 8,
        min: 80,
        max: 120
    }, {
        key: "map-mon-att-pierce",
        param_id: 9,
        min: 50,
        max: 50
    }, {
        key: "map-glob-boss-dropubermats",
        param_id: 10,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 80
    },
    image: {
        invfile: "invmap_outervoid",
        invtransform: ""
    }
}, {
    id: 455,
    kind: "item.unique",
    key: "Armageddon's Blade",
    base_code: "7cr2",
    name: "Armageddon's Blade",
    level: 90,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 75,
        max: 50
    }, {
        key: "pierce-fire",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "res-fire-max",
        param_id: 4,
        min: 5,
        max: 10
    }, {
        key: "block",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "all-stats",
        param_id: 6,
        min: 6,
        max: 6
    }, {
        key: "dmg%",
        param_id: 7,
        min: 280,
        max: 320
    }, {
        key: "equipped-skill",
        param_id: 8,
        min: 30,
        max: 30
    }, {
        key: "splash",
        param_id: 12,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 90
    },
    image: {
        invfile: "invarmageddonblade",
        invtransform: ""
    }
}];

export const setItems = [{
    id: 0,
    kind: "item.set-item",
    key: "Civerb's Ward",
    set_code: "Civerb's Vestments",
    base_code: "lrg",
    name: "Civerb's Ward",
    level: 13,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 60
    }, {
        key: "block",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "red-dmg%",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "res-pois",
        param_id: 2,
        min: 25,
        max: 26
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invlrg",
        invtransform: "lyel"
    },
    base: "Large Shield",
    set: "Civerb's Vestments"
}, {
    id: 1,
    kind: "item.set-item",
    key: "Civerb's Icon",
    set_code: "Civerb's Vestments",
    base_code: "amu",
    name: "Civerb's Icon",
    level: 13,
    modifiers: [{
        key: "regen-mana",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "regen",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "res-cold",
        param_id: 1,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invamu",
        invtransform: "lyel"
    },
    base: "Amulet",
    set: "Civerb's Vestments"
}, {
    id: 2,
    kind: "item.set-item",
    key: "Civerb's Cudgel",
    set_code: "Civerb's Vestments",
    base_code: "gsc",
    name: "Civerb's Cudgel",
    level: 13,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 17,
        max: 23
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg/lvl",
        param_id: 4,
        param: 8
    }, {
        key: "dmg-undead",
        param_id: 1,
        min: 100,
        max: 100
    }],
    requirements: {
        level: 9
    },
    image: {
        invfile: "invgsc",
        invtransform: "lyel"
    },
    base: "Grand Scepter",
    set: "Civerb's Vestments"
}, {
    id: 3,
    kind: "item.set-item",
    key: "Hsarus' Iron Heel",
    set_code: "Hsarus' Defense",
    base_code: "mbt",
    name: "Hsarus' Iron Heel",
    level: 4,
    modifiers: [{
        key: "res-fire",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "move2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 20
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invmbt",
        invtransform: "dred"
    },
    base: "Chain Boots",
    set: "Hsarus' Defense"
}, {
    id: 4,
    kind: "item.set-item",
    key: "Hsarus' Iron Fist",
    set_code: "Hsarus' Defense",
    base_code: "buc",
    name: "Hsarus' Iron Fist",
    level: 4,
    modifiers: [{
        key: "red-dmg",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "str",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 20
    }, {
        key: "splash",
        param_id: 1,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invbuc",
        invtransform: "dred"
    },
    base: "Buckler",
    set: "Hsarus' Defense"
}, {
    id: 5,
    kind: "item.set-item",
    key: "Hsarus' Iron Stay",
    set_code: "Hsarus' Defense",
    base_code: "mbl",
    name: "Hsarus' Iron Stay",
    level: 4,
    modifiers: [{
        key: "res-cold",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "hp",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 20
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invmbl",
        invtransform: "dred"
    },
    base: "Belt",
    set: "Hsarus' Defense"
}, {
    id: 6,
    kind: "item.set-item",
    key: "Cleglaw's Tooth",
    set_code: "Cleglaw's Brace",
    base_code: "lsd",
    name: "Cleglaw's Tooth",
    level: 6,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "deadly",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg/lvl",
        param_id: 1,
        param: 10
    }],
    requirements: {
        level: 4
    },
    image: {
        invfile: "invlsd",
        invtransform: "lred"
    },
    base: "Long Sword",
    set: "Cleglaw's Brace"
}, {
    id: 7,
    kind: "item.set-item",
    key: "Cleglaw's Claw",
    set_code: "Cleglaw's Brace",
    base_code: "sml",
    name: "Cleglaw's Claw",
    level: 6,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 17,
        max: 17
    }, {
        key: "res-pois-len",
        param_id: 2,
        min: 75,
        max: 75
    }, {
        key: "res-all",
        param_id: 1,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 4
    },
    image: {
        invfile: "invsml",
        invtransform: "lred"
    },
    base: "Small Shield",
    set: "Cleglaw's Brace"
}, {
    id: 8,
    kind: "item.set-item",
    key: "Cleglaw's Pincers",
    set_code: "Cleglaw's Brace",
    base_code: "mgl",
    name: "Cleglaw's Pincers",
    level: 6,
    modifiers: [{
        key: "knock",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "slow",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "pois-min",
        param_id: 3,
        min: 52,
        max: 52
    }, {
        key: "pois-max",
        param_id: 4,
        min: 52,
        max: 52
    }, {
        key: "pois-len",
        param_id: 5,
        min: 75,
        max: 75
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 20
    }],
    requirements: {
        level: 4
    },
    image: {
        invfile: "invmgl",
        invtransform: "lred"
    },
    base: "Chain Gloves",
    set: "Cleglaw's Brace"
}, {
    id: 9,
    kind: "item.set-item",
    key: "Iratha's Collar",
    set_code: "Iratha's Finery",
    base_code: "amu",
    name: "Iratha's Collar",
    level: 21,
    modifiers: [{
        key: "res-pois",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "res-pois-len",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "ama",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invamu",
        invtransform: "lgry"
    },
    base: "Amulet",
    set: "Iratha's Finery"
}, {
    id: 10,
    kind: "item.set-item",
    key: "Iratha's Cuff",
    set_code: "Iratha's Finery",
    base_code: "tgl",
    name: "Iratha's Cuff",
    level: 21,
    modifiers: [{
        key: "res-cold",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "half-freeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "pierce",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgry"
    },
    base: "Light Gauntlets",
    set: "Iratha's Finery"
}, {
    id: 11,
    kind: "item.set-item",
    key: "Iratha's Coil",
    set_code: "Iratha's Finery",
    base_code: "crn",
    name: "Iratha's Coil",
    level: 21,
    modifiers: [{
        key: "res-fire",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "res-ltng",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "ama",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invcrn",
        invtransform: "lgry"
    },
    base: "Crown",
    set: "Iratha's Finery"
}, {
    id: 12,
    kind: "item.set-item",
    key: "Iratha's Cord",
    set_code: "Iratha's Finery",
    base_code: "tbl",
    name: "Iratha's Cord",
    level: 21,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "dmg-min",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "dex",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invtbl",
        invtransform: "lgry"
    },
    base: "Heavy Belt",
    set: "Iratha's Finery"
}, {
    id: 13,
    kind: "item.set-item",
    key: "Isenhart's Lightbrand",
    set_code: "Isenhart's Armory",
    base_code: "bsd",
    name: "Isenhart's Lightbrand",
    level: 11,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "att/lvl",
        param_id: 4,
        param: 10
    }, {
        key: "dmg-ltng/lvl",
        param_id: 1,
        param: 40
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invbsd",
        invtransform: "lgld"
    },
    base: "Broad Sword",
    set: "Isenhart's Armory"
}, {
    id: 14,
    kind: "item.set-item",
    key: "Isenhart's Parry",
    set_code: "Isenhart's Armory",
    base_code: "gts",
    name: "Isenhart's Parry",
    level: 11,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "thorns/lvl",
        param_id: 2,
        param: 20
    }, {
        key: "res-fire/lvl",
        param_id: 2,
        param: 8
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invgts",
        invtransform: "lgld"
    },
    base: "Gothic Shield",
    set: "Isenhart's Armory"
}, {
    id: 15,
    kind: "item.set-item",
    key: "Isenhart's Case",
    set_code: "Isenhart's Armory",
    base_code: "brs",
    name: "Isenhart's Case",
    level: 11,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "red-mag",
        param_id: 2,
        min: 2,
        max: 4
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "res-cold/lvl",
        param_id: 2,
        param: 8
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invbrs",
        invtransform: "lgld"
    },
    base: "Breast Plate",
    set: "Isenhart's Armory"
}, {
    id: 16,
    kind: "item.set-item",
    key: "Isenhart's Horns",
    set_code: "Isenhart's Armory",
    base_code: "fhl",
    name: "Isenhart's Horns",
    level: 11,
    modifiers: [{
        key: "dex",
        param_id: 1,
        min: 6,
        max: 6
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 2,
        max: 4
    }, {
        key: "dmg-max",
        param_id: 3,
        min: 4,
        max: 8
    }, {
        key: "res-ltng/lvl",
        param_id: 2,
        param: 8
    }],
    requirements: {
        level: 8
    },
    image: {
        invfile: "invfhl",
        invtransform: "lgld"
    },
    base: "Full Helm",
    set: "Isenhart's Armory"
}, {
    id: 17,
    kind: "item.set-item",
    key: "Vidala's Barb",
    set_code: "Vidala's Rig",
    base_code: "lbb",
    name: "Vidala's Barb",
    level: 19,
    modifiers: [{
        key: "ltng-min",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "ltng-max",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "dmg%",
        param_id: 3,
        min: 30,
        max: 45
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "dex/lvl",
        param_id: 3,
        param: 16
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invlbb",
        invtransform: "blac"
    },
    base: "Long Battle Bow",
    set: "Vidala's Rig"
}, {
    id: 18,
    kind: "item.set-item",
    key: "Vidala's Fetlock",
    set_code: "Vidala's Rig",
    base_code: "tbt",
    name: "Vidala's Fetlock",
    level: 19,
    modifiers: [{
        key: "stam",
        param_id: 1,
        min: 150,
        max: 150
    }, {
        key: "move3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "res-all",
        param_id: 1,
        min: 8,
        max: 8
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invtbt",
        invtransform: "blac"
    },
    base: "Light Plated Boots",
    set: "Vidala's Rig"
}, {
    id: 19,
    kind: "item.set-item",
    key: "Vidala's Ambush",
    set_code: "Vidala's Rig",
    base_code: "lea",
    name: "Vidala's Ambush",
    level: 19,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 2,
        min: 15,
        max: 25
    }, {
        key: "res-fire",
        param_id: 1,
        min: 24,
        max: 24
    }, {
        key: "ac/lvl",
        param_id: 2,
        param: 20
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invlea",
        invtransform: "blac"
    },
    base: "Leather Armor",
    set: "Vidala's Rig"
}, {
    id: 20,
    kind: "item.set-item",
    key: "Vidala's Snare",
    set_code: "Vidala's Rig",
    base_code: "amu",
    name: "Vidala's Snare",
    level: 19,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "res-cold",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "pierce",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "mag%",
        param_id: 1,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 14
    },
    image: {
        invfile: "invamu",
        invtransform: "blac"
    },
    base: "Amulet",
    set: "Vidala's Rig"
}, {
    id: 21,
    kind: "item.set-item",
    key: "Milabrega's Orb",
    set_code: "Milabrega's Regalia",
    base_code: "kit",
    name: "Milabrega's Orb",
    level: 23,
    modifiers: [{
        key: "mag%",
        param_id: 1,
        min: 20,
        max: 60
    }, {
        key: "ac",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "hp",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "gethit-skill",
        param_id: 1,
        min: 25,
        max: 8
    }, {
        key: "block",
        param_id: 2,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invkit",
        invtransform: "dblu"
    },
    base: "Kite Shield",
    set: "Milabrega's Regalia"
}, {
    id: 22,
    kind: "item.set-item",
    key: "Milabrega's Rod",
    set_code: "Milabrega's Regalia",
    base_code: "wsp",
    name: "Milabrega's Rod",
    level: 23,
    modifiers: [{
        key: "pal",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "dmg%",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "light",
        param_id: 3,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 4,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg-cold",
        param_id: 5,
        min: 35,
        max: 55
    }, {
        key: "hit-skill",
        param_id: 1,
        min: 12,
        max: 9
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invwsp",
        invtransform: "dblu"
    },
    base: "War Scepter",
    set: "Milabrega's Regalia"
}, {
    id: 23,
    kind: "item.set-item",
    key: "Milabrega's Diadem",
    set_code: "Milabrega's Regalia",
    base_code: "crn",
    name: "Milabrega's Diadem",
    level: 23,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "mana",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "dmg-cold",
        param_id: 3,
        min: 25,
        max: 35
    }, {
        key: "res-cold",
        param_id: 1,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invcrn",
        invtransform: "dblu"
    },
    base: "Crown",
    set: "Milabrega's Regalia"
}, {
    id: 24,
    kind: "item.set-item",
    key: "Milabrega's Robe",
    set_code: "Milabrega's Regalia",
    base_code: "aar",
    name: "Milabrega's Robe",
    level: 23,
    modifiers: [{
        key: "thorns",
        param_id: 1,
        min: 13,
        max: 13
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "dmg-cold",
        param_id: 3,
        min: 25,
        max: 35
    }, {
        key: "ac%",
        param_id: 4,
        min: 60,
        max: 100
    }, {
        key: "hit-skill",
        param_id: 1,
        min: 14,
        max: 8
    }],
    requirements: {
        level: 17
    },
    image: {
        invfile: "invaar",
        invtransform: "dblu"
    },
    base: "Ancient Armor",
    set: "Milabrega's Regalia"
}, {
    id: 25,
    kind: "item.set-item",
    key: "Cathan's Rule",
    set_code: "Cathan's Traps",
    base_code: "bst",
    name: "Cathan's Rule",
    level: 15,
    modifiers: [{
        key: "fireskill",
        param_id: 1,
        min: 1,
        max: 2
    }, {
        key: "fire-max",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "cast2",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "cast-skill",
        param_id: 5,
        param: 46,
        min: 12,
        max: 10
    }, {
        key: "mana",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "res-all",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "reduce-ac",
        param_id: 3,
        min: 35,
        max: 35
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invbst",
        invtransform: "dgrn"
    },
    base: "Battle Staff",
    set: "Cathan's Traps"
}, {
    id: 26,
    kind: "item.set-item",
    key: "Cathan's Mesh",
    set_code: "Cathan's Traps",
    base_code: "chn",
    name: "Cathan's Mesh",
    level: 15,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "ease",
        param_id: 2,
        min: -50,
        max: -50
    }, {
        key: "move3",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "thorns/lvl",
        param_id: 1,
        param: 8
    }, {
        key: "res-fire",
        param_id: 2,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invchn",
        invtransform: "dgrn"
    },
    base: "Chain Mail",
    set: "Cathan's Traps"
}, {
    id: 27,
    kind: "item.set-item",
    key: "Cathan's Visage",
    set_code: "Cathan's Traps",
    base_code: "msk",
    name: "Cathan's Visage",
    level: 15,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "res-cold",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "manasteal",
        param_id: 3,
        min: 3,
        max: 5
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "att",
        param_id: 2,
        min: 60,
        max: 60
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invmsk",
        invtransform: "dgrn"
    },
    base: "Mask",
    set: "Cathan's Traps"
}, {
    id: 28,
    kind: "item.set-item",
    key: "Cathan's Sigil",
    set_code: "Cathan's Traps",
    base_code: "amu",
    name: "Cathan's Sigil",
    level: 15,
    modifiers: [{
        key: "balance1",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "thorns/lvl",
        param_id: 2,
        param: 8
    }, {
        key: "res-ltng",
        param_id: 3,
        min: 20,
        max: 30
    }, {
        key: "att",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "mag%",
        param_id: 2,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invamu",
        invtransform: "dgrn"
    },
    base: "Amulet",
    set: "Cathan's Traps"
}, {
    id: 29,
    kind: "item.set-item",
    key: "Cathan's Seal",
    set_code: "Cathan's Traps",
    base_code: "rin",
    name: "Cathan's Seal",
    level: 15,
    modifiers: [{
        key: "lifesteal",
        param_id: 1,
        min: 6,
        max: 6
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "str",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-max",
        param_id: 2,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 11
    },
    image: {
        invfile: "invrin",
        invtransform: "dgrn"
    },
    base: "Ring",
    set: "Cathan's Traps"
}, {
    id: 30,
    kind: "item.set-item",
    key: "Tancred's Crowbill",
    set_code: "Tancred's Battlegear",
    base_code: "mpi",
    name: "Tancred's Crowbill",
    level: 27,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 100,
        max: 175
    }, {
        key: "dmg%",
        param_id: 2,
        min: 60,
        max: 80
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "mana",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "att-skill",
        param_id: 5,
        min: 33,
        max: 12
    }, {
        key: "swing2",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "att-skill",
        param_id: 2,
        min: 20,
        max: 12
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invmpi",
        invtransform: "dgld"
    },
    base: "Military Pick",
    set: "Tancred's Battlegear"
}, {
    id: 31,
    kind: "item.set-item",
    key: "Tancred's Spine",
    set_code: "Tancred's Battlegear",
    base_code: "ful",
    name: "Tancred's Spine",
    level: 27,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "str",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "dmg%",
        param_id: 3,
        min: 30,
        max: 45
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 48
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invful",
        invtransform: "dgld"
    },
    base: "Full Plate Mail",
    set: "Tancred's Battlegear"
}, {
    id: 32,
    kind: "item.set-item",
    key: "Tancred's Hobnails",
    set_code: "Tancred's Battlegear",
    base_code: "lbt",
    name: "Tancred's Hobnails",
    level: 27,
    modifiers: [{
        key: "regen-stam",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "red-dmg%",
        param_id: 3,
        min: 5,
        max: 10
    }, {
        key: "move3",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invlbt",
        invtransform: "dgld"
    },
    base: "Boots",
    set: "Tancred's Battlegear"
}, {
    id: 33,
    kind: "item.set-item",
    key: "Tancred's Weird",
    set_code: "Tancred's Battlegear",
    base_code: "amu",
    name: "Tancred's Weird",
    level: 27,
    modifiers: [{
        key: "red-dmg",
        param_id: 1,
        min: 3,
        max: 6
    }, {
        key: "red-mag",
        param_id: 2,
        min: 2,
        max: 4
    }, {
        key: "dmg-ltng",
        param_id: 3,
        min: 1,
        max: 45
    }, {
        key: "mag%",
        param_id: 1,
        min: 78,
        max: 78
    }, {
        key: "att",
        param_id: 2,
        min: 160,
        max: 160
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invamu",
        invtransform: "dgld"
    },
    base: "Amulet",
    set: "Tancred's Battlegear"
}, {
    id: 34,
    kind: "item.set-item",
    key: "Tancred's Skull",
    set_code: "Tancred's Battlegear",
    base_code: "bhm",
    name: "Tancred's Skull",
    level: 27,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 20,
        max: 30
    }, {
        key: "att",
        param_id: 2,
        min: 80,
        max: 80
    }, {
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invbhm",
        invtransform: "dgld"
    },
    base: "Bone Helm",
    set: "Tancred's Battlegear"
}, {
    id: 35,
    kind: "item.set-item",
    key: "Sigon's Gage",
    set_code: "Sigon's Complete Steel",
    base_code: "hgl",
    name: "Sigon's Gage",
    level: 9,
    modifiers: [{
        key: "str",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "att",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "swing3",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invhgl",
        invtransform: "whit"
    },
    base: "Gauntlets",
    set: "Sigon's Complete Steel"
}, {
    id: 36,
    kind: "item.set-item",
    key: "Sigon's Visor",
    set_code: "Sigon's Complete Steel",
    base_code: "ghm",
    name: "Sigon's Visor",
    level: 9,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "ac",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 16
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invghm",
        invtransform: "whit"
    },
    base: "Great Helm",
    set: "Sigon's Complete Steel"
}, {
    id: 37,
    kind: "item.set-item",
    key: "Sigon's Shelter",
    set_code: "Sigon's Complete Steel",
    base_code: "gth",
    name: "Sigon's Shelter",
    level: 9,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "res-ltng",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "thorns",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invgth",
        invtransform: "whit"
    },
    base: "Gothic Plate",
    set: "Sigon's Complete Steel"
}, {
    id: 38,
    kind: "item.set-item",
    key: "Sigon's Sabot",
    set_code: "Sigon's Complete Steel",
    base_code: "hbt",
    name: "Sigon's Sabot",
    level: 9,
    modifiers: [{
        key: "move2",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "res-cold",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "att",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "mag%",
        param_id: 2,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invhbt",
        invtransform: "whit"
    },
    base: "Greaves",
    set: "Sigon's Complete Steel"
}, {
    id: 39,
    kind: "item.set-item",
    key: "Sigon's Wrap",
    set_code: "Sigon's Complete Steel",
    base_code: "hbl",
    name: "Sigon's Wrap",
    level: 9,
    modifiers: [{
        key: "res-fire",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "hp",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 16
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invhbl",
        invtransform: "whit"
    },
    base: "Plated Belt",
    set: "Sigon's Complete Steel"
}, {
    id: 40,
    kind: "item.set-item",
    key: "Sigon's Guard",
    set_code: "Sigon's Complete Steel",
    base_code: "tow",
    name: "Sigon's Guard",
    level: 9,
    modifiers: [{
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "block",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-cold",
        param_id: 3,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invtow",
        invtransform: "whit"
    },
    base: "Tower Shield",
    set: "Sigon's Complete Steel"
}, {
    id: 41,
    kind: "item.set-item",
    key: "Infernal Cranium",
    set_code: "Infernal Tools",
    base_code: "cap",
    name: "Infernal Cranium",
    level: 7,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 10,
        max: 10
    }, {
        key: "dmg-to-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 32
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invcap",
        invtransform: "lyel"
    },
    base: "Cap",
    set: "Infernal Tools"
}, {
    id: 42,
    kind: "item.set-item",
    key: "Infernal Spire",
    set_code: "Infernal Tools",
    base_code: "dgr",
    name: "Infernal Spire",
    level: 7,
    modifiers: [{
        key: "dmg-min",
        param_id: 1,
        min: 8,
        max: 8
    }, {
        key: "nec",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "deadly",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg-undead",
        param_id: 5,
        min: 150,
        max: 150
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 20
    }, {
        key: "oskill",
        param_id: 2,
        param: 73,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invdgrgull",
        invtransform: ""
    },
    base: "Dagger",
    set: "Infernal Tools"
}, {
    id: 43,
    kind: "item.set-item",
    key: "Infernal Sign",
    set_code: "Infernal Tools",
    base_code: "tbl",
    name: "Infernal Sign",
    level: 7,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "hp",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-pois",
        param_id: 1,
        min: 45,
        max: 45
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 5
    },
    image: {
        invfile: "invtbl",
        invtransform: "lyel"
    },
    base: "Heavy Belt",
    set: "Infernal Tools"
}, {
    id: 44,
    kind: "item.set-item",
    key: "Berserker's Headgear",
    set_code: "Berserker's Garb",
    base_code: "hlm",
    name: "Berserker's Headgear",
    level: 5,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "res-fire",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "bar",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invhlm",
        invtransform: "dred"
    },
    base: "Helm",
    set: "Berserker's Arsenal"
}, {
    id: 45,
    kind: "item.set-item",
    key: "Berserker's Hauberk",
    set_code: "Berserker's Garb",
    base_code: "spl",
    name: "Berserker's Hauberk",
    level: 5,
    modifiers: [{
        key: "red-mag",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "bar",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 36
    }, {
        key: "dmg%/lvl",
        param_id: 2,
        param: 28
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "invspl",
        invtransform: "dred"
    },
    base: "Splint Mail",
    set: "Berserker's Arsenal"
}, {
    id: 46,
    kind: "item.set-item",
    key: "Berserker's Hatchet",
    set_code: "Berserker's Garb",
    base_code: "2ax",
    name: "Berserker's Hatchet",
    level: 5,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "manasteal",
        param_id: 2,
        min: 5,
        max: 5
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg%",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dmg/lvl",
        param_id: 2,
        param: 8
    }],
    requirements: {
        level: 3
    },
    image: {
        invfile: "inv2ax",
        invtransform: "dred"
    },
    base: "Double Axe",
    set: "Berserker's Arsenal"
}, {
    id: 47,
    kind: "item.set-item",
    key: "Death's Hand",
    set_code: "Death's Disguise",
    base_code: "lgl",
    name: "Death's Hand",
    level: 8,
    modifiers: [{
        key: "res-pois",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "res-pois-len",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "swing3",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "dmg/lvl",
        param_id: 2,
        param: 4
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invlgl",
        invtransform: "lred"
    },
    base: "Leather Gloves",
    set: "Death's Disguise"
}, {
    id: 48,
    kind: "item.set-item",
    key: "Death's Guard",
    set_code: "Death's Disguise",
    base_code: "lbl",
    name: "Death's Guard",
    level: 8,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "res-all",
        param_id: 1,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invlbl",
        invtransform: "lred"
    },
    base: "Sash",
    set: "Death's Disguise"
}, {
    id: 49,
    kind: "item.set-item",
    key: "Death's Touch",
    set_code: "Death's Disguise",
    base_code: "wsd",
    name: "Death's Touch",
    level: 8,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 60,
        max: 90
    }, {
        key: "lifesteal",
        param_id: 2,
        min: 4,
        max: 4
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg-cold",
        param_id: 1,
        param: 75,
        min: 25,
        max: 75
    }, {
        key: "reanimate",
        param_id: 2,
        param: 1,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 6
    },
    image: {
        invfile: "invwsd",
        invtransform: "lred"
    },
    base: "War Sword",
    set: "Death's Disguise"
}, {
    id: 50,
    kind: "item.set-item",
    key: "Angelic Sickle",
    set_code: "Angelical Raiment",
    base_code: "sbr",
    name: "Angelic Sickle",
    level: 17,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "dmg-undead",
        param_id: 2,
        min: 250,
        max: 250
    }, {
        key: "splash",
        param_id: 3,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg-max",
        param_id: 4,
        min: 12,
        max: 12
    }, {
        key: "dmg%",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "swing3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "hit-skill",
        param_id: 3,
        min: 10,
        max: 1
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invsbr",
        invtransform: "lgry"
    },
    base: "Sabre",
    set: "Angelic Raiment"
}, {
    id: 51,
    kind: "item.set-item",
    key: "Angelic Mantle",
    set_code: "Angelical Raiment",
    base_code: "rng",
    name: "Angelic Mantle",
    level: 17,
    modifiers: [{
        key: "red-dmg",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "ac%",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "dmg-undead",
        param_id: 3,
        min: 50,
        max: 80
    }, {
        key: "ac",
        param_id: 1,
        min: 150,
        max: 150
    }, {
        key: "res-fire",
        param_id: 2,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invrng",
        invtransform: "lgry"
    },
    base: "Ring Mail",
    set: "Angelic Raiment"
}, {
    id: 52,
    kind: "item.set-item",
    key: "Angelic Halo",
    set_code: "Angelical Raiment",
    base_code: "rin",
    name: "Angelic Halo",
    level: 17,
    modifiers: [{
        key: "regen",
        param_id: 1,
        min: 6,
        max: 6
    }, {
        key: "hp",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 24
    }, {
        key: "mag%",
        param_id: 2,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invrin",
        invtransform: "lgry"
    },
    base: "Ring",
    set: "Angelic Raiment"
}, {
    id: 53,
    kind: "item.set-item",
    key: "Angelic Wings",
    set_code: "Angelical Raiment",
    base_code: "amu",
    name: "Angelic Wings",
    level: 17,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 3,
        max: 3
    }, {
        key: "dmg-to-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "hp",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 12
    },
    image: {
        invfile: "invamu",
        invtransform: "lgry"
    },
    base: "Amulet",
    set: "Angelic Raiment"
}, {
    id: 54,
    kind: "item.set-item",
    key: "Arctic Horn",
    set_code: "Arctic Gear",
    base_code: "swb",
    name: "Arctic Horn",
    level: 3,
    modifiers: [{
        key: "att%",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "dmg-cold/lvl",
        param_id: 3,
        param: 16
    }, {
        key: "att/lvl",
        param_id: 1,
        param: 16
    }, {
        key: "dmg-cold",
        param_id: 2,
        param: 75,
        min: 20,
        max: 30
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invswb",
        invtransform: "lgld"
    },
    base: "Short War Bow",
    set: "Arctic Gear"
}, {
    id: 55,
    kind: "item.set-item",
    key: "Arctic Furs",
    set_code: "Arctic Gear",
    base_code: "qui",
    name: "Arctic Furs",
    level: 3,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 275,
        max: 325
    }, {
        key: "res-all",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 24
    }, {
        key: "res-cold",
        param_id: 2,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invqlt",
        invtransform: "lgld"
    },
    base: "Quilted Armor",
    set: "Arctic Gear"
}, {
    id: 56,
    kind: "item.set-item",
    key: "Arctic Binding",
    set_code: "Arctic Gear",
    base_code: "vbl",
    name: "Arctic Binding",
    level: 3,
    modifiers: [{
        key: "res-cold",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "ac",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "mag%",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "res-cold",
        param_id: 2,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invvbl",
        invtransform: "lgld"
    },
    base: "Light Belt",
    set: "Arctic Gear"
}, {
    id: 57,
    kind: "item.set-item",
    key: "Arctic Mitts",
    set_code: "Arctic Gear",
    base_code: "tgl",
    name: "Arctic Mitts",
    level: 3,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 20,
        max: 20
    }, {
        key: "swing1",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "att",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dex",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "pierce",
        param_id: 1,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 2
    },
    image: {
        invfile: "invtgl",
        invtransform: "lgld"
    },
    base: "Light Gauntlets",
    set: "Arctic Gear"
}, {
    id: 58,
    kind: "item.set-item",
    key: "Arcanna's Sign",
    set_code: "Arcanna's Tricks",
    base_code: "amu",
    name: "Arcanna's Sign",
    level: 20,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "mag%",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "res-fire",
        param_id: 2,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invamu",
        invtransform: "blac"
    },
    base: "Amulet",
    set: "Arcanna's Tricks"
}, {
    id: 59,
    kind: "item.set-item",
    key: "Arcanna's Deathwand",
    set_code: "Arcanna's Tricks",
    base_code: "wst",
    name: "Arcanna's Deathwand",
    level: 20,
    modifiers: [{
        key: "sor",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "deadly",
        param_id: 2,
        min: 25,
        max: 50
    }, {
        key: "dmg%",
        param_id: 3,
        min: 50,
        max: 75
    }, {
        key: "splash",
        param_id: 4,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "cast2",
        param_id: 5,
        min: 10,
        max: 10
    }, {
        key: "cast-skill",
        param_id: 6,
        param: 84,
        min: 15,
        max: 2
    }, {
        key: "mana",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 3,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invwst",
        invtransform: "blac"
    },
    base: "War Staff",
    set: "Arcanna's Tricks"
}, {
    id: 60,
    kind: "item.set-item",
    key: "Arcanna's Head",
    set_code: "Arcanna's Tricks",
    base_code: "skp",
    name: "Arcanna's Head",
    level: 20,
    modifiers: [{
        key: "regen",
        param_id: 1,
        min: 10,
        max: 14
    }, {
        key: "thorns",
        param_id: 2,
        min: 12,
        max: 12
    }, {
        key: "regen-mana",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "mana",
        param_id: 4,
        min: 30,
        max: 40
    }, {
        key: "ac/lvl",
        param_id: 1,
        param: 24
    }, {
        key: "res-ltng",
        param_id: 2,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invskp",
        invtransform: "blac"
    },
    base: "Skull Cap",
    set: "Arcanna's Tricks"
}, {
    id: 61,
    kind: "item.set-item",
    key: "Arcanna's Flesh",
    set_code: "Arcanna's Tricks",
    base_code: "ltp",
    name: "Arcanna's Flesh",
    level: 20,
    modifiers: [{
        key: "light",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "red-dmg",
        param_id: 2,
        min: 3,
        max: 6
    }, {
        key: "cast2",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "ac",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "enr",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "regen-mana",
        param_id: 3,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 15
    },
    image: {
        invfile: "invltp",
        invtransform: "blac"
    },
    base: "Light Plate",
    set: "Arcanna's Tricks"
}, {
    id: 62,
    kind: "item.set-item",
    key: "Expansion",
    set_code: "",
    base_code: "",
    name: "Expansion",
    level: null,
    modifiers: [],
    requirements: {
        level: ""
    },
    image: {
        invfile: "",
        invtransform: ""
    }
}, {
    id: 63,
    kind: "item.set-item",
    key: "Natalya's Totem",
    set_code: "Natalya's Odium",
    base_code: "xh9",
    name: "Natalya's Totem",
    level: 22,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 135,
        max: 175
    }, {
        key: "dex",
        param_id: 2,
        min: 25,
        max: 30
    }, {
        key: "str",
        param_id: 3,
        min: 15,
        max: 20
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "red-mag",
        param_id: 5,
        min: 3,
        max: 6
    }, {
        key: "enr",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 59
    },
    image: {
        invfile: "invbhm",
        invtransform: "dgry"
    },
    base: "Grim Helm",
    set: "Natalya's Odium"
}, {
    id: 64,
    kind: "item.set-item",
    key: "Natalya's Mark",
    set_code: "Natalya's Odium",
    base_code: "7qr",
    name: "Natalya's Mark",
    level: 22,
    modifiers: [{
        key: "swing3",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 2,
        min: 150,
        max: 200
    }, {
        key: "dmg-cold",
        param_id: 4,
        param: 100,
        min: 150,
        max: 150
    }, {
        key: "dmg-fire",
        param_id: 5,
        min: 96,
        max: 136
    }, {
        key: "dmg-undead",
        param_id: 6,
        min: 100,
        max: 200
    }, {
        key: "dmg-demon",
        param_id: 7,
        min: 100,
        max: 200
    }, {
        key: "splash",
        param_id: 8,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "ignore-ac",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 79
    },
    image: {
        invfile: "invskr",
        invtransform: "dgry"
    },
    base: "Scissors Suwayyah",
    set: "Natalya's Odium"
}, {
    id: 65,
    kind: "item.set-item",
    key: "Natalya's Shadow",
    set_code: "Natalya's Odium",
    base_code: "ucl",
    name: "Natalya's Shadow",
    level: 22,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 150,
        max: 225
    }, {
        key: "hp/lvl",
        param_id: 2,
        param: 12
    }, {
        key: "skilltab",
        param_id: 3,
        param: 19,
        min: 2,
        max: 3
    }, {
        key: "res-pois-len",
        param_id: 4,
        min: 75,
        max: 75
    }, {
        key: "res-pois",
        param_id: 5,
        min: 25,
        max: 25
    }, {
        key: "sock",
        param_id: 6,
        min: 1,
        max: 3
    }, {
        key: "ass",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invscl",
        invtransform: "dgry"
    },
    base: "Loricated Mail",
    set: "Natalya's Odium"
}, {
    id: 66,
    kind: "item.set-item",
    key: "Natalya's Soul",
    set_code: "Natalya's Odium",
    base_code: "xmb",
    name: "Natalya's Soul",
    level: 22,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 75,
        max: 125
    }, {
        key: "move3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "regen-stam/lvl",
        param_id: 3,
        param: 2
    }, {
        key: "dur",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "res-cold",
        param_id: 5,
        min: 15,
        max: 25
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 15,
        max: 25
    }, {
        key: "kick",
        param_id: 2,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invmbt",
        invtransform: "dgry"
    },
    base: "Mesh Boots",
    set: "Natalya's Odium"
}, {
    id: 67,
    kind: "item.set-item",
    key: "Aldur's Stony Gaze",
    set_code: "Aldur's Watchtower",
    base_code: "dr8",
    name: "Aldur's Stony Gaze",
    level: 29,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 90,
        max: 90
    }, {
        key: "regen-mana",
        param_id: 2,
        min: 17,
        max: 17
    }, {
        key: "balance3",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "res-cold",
        param_id: 4,
        min: 40,
        max: 50
    }, {
        key: "skilltab",
        param_id: 5,
        param: 15,
        min: 1,
        max: 2
    }, {
        key: "dru",
        param_id: 6,
        min: 1,
        max: 2
    }, {
        key: "enr",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "enr",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "enr",
        param_id: 3,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 36
    },
    image: {
        invfile: "invdr3",
        invtransform: "oran"
    },
    base: "Hunter's Guise",
    set: "Aldur's Watchtower"
}, {
    id: 68,
    kind: "item.set-item",
    key: "Aldur's Deception",
    set_code: "Aldur's Watchtower",
    base_code: "uul",
    name: "Aldur's Deception",
    level: 29,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 300,
        max: 300
    }, {
        key: "skilltab",
        param_id: 2,
        param: 16,
        min: 1,
        max: 2
    }, {
        key: "str",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "res-ltng",
        param_id: 5,
        min: 40,
        max: 50
    }, {
        key: "ease",
        param_id: 6,
        min: -50,
        max: -50
    }, {
        key: "skilltab",
        param_id: 7,
        param: 17,
        min: 1,
        max: 2
    }, {
        key: "vit",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "vit",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "vit",
        param_id: 3,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invful",
        invtransform: "oran"
    },
    base: "Shadow Plate",
    set: "Aldur's Watchtower"
}, {
    id: 69,
    kind: "item.set-item",
    key: "Aldur's Gauntlet",
    set_code: "Aldur's Watchtower",
    base_code: "9mt",
    name: "Aldur's Rhythm",
    level: 29,
    modifiers: [{
        key: "dmg-norm",
        param_id: 1,
        min: 40,
        max: 62
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 50,
        max: 75
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "swing3",
        param_id: 4,
        min: 45,
        max: 45
    }, {
        key: "dmg-demon",
        param_id: 5,
        min: 200,
        max: 250
    }, {
        key: "manasteal",
        param_id: 6,
        min: 5,
        max: 5
    }, {
        key: "sock",
        param_id: 7,
        min: 2,
        max: 3
    }, {
        key: "dmg-undead",
        param_id: 8,
        min: 100,
        max: 200
    }, {
        key: "splash",
        param_id: 9,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "str",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "str",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "str",
        param_id: 3,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invmst",
        invtransform: "oran"
    },
    base: "Jagged Star",
    set: "Aldur's Watchtower"
}, {
    id: 70,
    kind: "item.set-item",
    key: "Aldur's Advance",
    set_code: "Aldur's Watchtower",
    base_code: "xtb",
    name: "Aldur's Advance",
    level: 29,
    modifiers: [{
        key: "indestruct",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "regen-stam",
        param_id: 2,
        min: 32,
        max: 32
    }, {
        key: "hp",
        param_id: 3,
        min: 50,
        max: 50
    }, {
        key: "dmg-to-mana",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "move3",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "stam",
        param_id: 6,
        min: 180,
        max: 180
    }, {
        key: "res-fire",
        param_id: 7,
        min: 40,
        max: 50
    }, {
        key: "dex",
        param_id: 1,
        min: 15,
        max: 15
    }, {
        key: "dex",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "dex",
        param_id: 3,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invtbt",
        invtransform: "oran"
    },
    base: "Battle Boots",
    set: "Aldur's Watchtower"
}, {
    id: 71,
    kind: "item.set-item",
    key: "Immortal King's Will",
    set_code: "Immortal King",
    base_code: "ba5",
    name: "Immortal King's Will",
    level: 37,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 125,
        max: 125
    }, {
        key: "gold%",
        param_id: 2,
        min: 37,
        max: 67
    }, {
        key: "skilltab",
        param_id: 3,
        param: 14,
        min: 2,
        max: 2
    }, {
        key: "light",
        param_id: 4,
        min: 4,
        max: 4
    }, {
        key: "mag%",
        param_id: 5,
        min: 25,
        max: 40
    }, {
        key: "sock",
        param_id: 6,
        min: 2,
        max: 2
    }, {
        key: "red-dmg%",
        param_id: 2,
        min: 8,
        max: 8
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invba5",
        invtransform: "lgry"
    },
    base: "Avenger Guard",
    set: "Immortal King"
}, {
    id: 72,
    kind: "item.set-item",
    key: "Immortal King's Soul Cage",
    set_code: "Immortal King",
    base_code: "uar",
    name: "Immortal King's Soul Cage",
    level: 37,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 300,
        max: 550
    }, {
        key: "gethit-skill",
        param_id: 2,
        param: 52,
        min: 5,
        max: 28
    }, {
        key: "skilltab",
        param_id: 3,
        param: 12,
        min: 3,
        max: 4
    }, {
        key: "res-pois",
        param_id: 4,
        min: 40,
        max: 60
    }, {
        key: "balance2",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "res-cold",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "res-fire",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "ac%",
        param_id: 5,
        min: 50,
        max: 50
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invaar",
        invtransform: "lgry"
    },
    base: "Sacred Armor",
    set: "Immortal King"
}, {
    id: 73,
    kind: "item.set-item",
    key: "Immortal King's Detail",
    set_code: "Immortal King",
    base_code: "zhb",
    name: "Immortal King's Detail",
    level: 37,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 28,
        max: 56
    }, {
        key: "res-fire",
        param_id: 2,
        min: 23,
        max: 28
    }, {
        key: "res-ltng",
        param_id: 3,
        min: 26,
        max: 33
    }, {
        key: "str",
        param_id: 4,
        min: 20,
        max: 25
    }, {
        key: "ac",
        param_id: 1,
        min: 105,
        max: 105
    }, {
        key: "balance2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "ac%",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "red-dmg%",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "skilltab",
        param_id: 5,
        param: 13,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invhbl",
        invtransform: "lgry"
    },
    base: "War Belt",
    set: "Immortal King"
}, {
    id: 74,
    kind: "item.set-item",
    key: "Immortal King's Forge",
    set_code: "Immortal King",
    base_code: "xhg",
    name: "Immortal King's Forge",
    level: 37,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 45,
        max: 90
    }, {
        key: "str",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "dex",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 38,
        min: 12,
        max: 24
    }, {
        key: "swing2",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "ac",
        param_id: 2,
        min: 120,
        max: 120
    }, {
        key: "lifesteal",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "manasteal",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "freeze",
        param_id: 5,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 30
    },
    image: {
        invfile: "invhgl",
        invtransform: "lgry"
    },
    base: "War Gauntlets",
    set: "Immortal King"
}, {
    id: 75,
    kind: "item.set-item",
    key: "Immortal King's Pillar",
    set_code: "Immortal King",
    base_code: "xhb",
    name: "Immortal King's Pillar",
    level: 37,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 85
    }, {
        key: "move3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "att",
        param_id: 3,
        min: 90,
        max: 140
    }, {
        key: "hp",
        param_id: 4,
        min: 38,
        max: 54
    }, {
        key: "mag%",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "skilltab",
        param_id: 2,
        param: 12,
        min: 2,
        max: 2
    }, {
        key: "ac",
        param_id: 3,
        min: 160,
        max: 160
    }, {
        key: "half-freeze",
        param_id: 4,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 31
    },
    image: {
        invfile: "invhbt",
        invtransform: "lgry"
    },
    base: "War Boots",
    set: "Immortal King"
}, {
    id: 76,
    kind: "item.set-item",
    key: "Immortal King's Stone Crusher",
    set_code: "Immortal King",
    base_code: "7m7",
    name: "Immortal King's Stone Crusher",
    level: 37,
    modifiers: [{
        key: "indestruct",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "swing3",
        param_id: 2,
        min: 45,
        max: 45
    }, {
        key: "dmg-demon",
        param_id: 3,
        min: 175,
        max: 225
    }, {
        key: "dmg-undead",
        param_id: 4,
        min: 125,
        max: 225
    }, {
        key: "crush",
        param_id: 5,
        min: 35,
        max: 40
    }, {
        key: "dmg%",
        param_id: 6,
        min: 175,
        max: 225
    }, {
        key: "splash",
        param_id: 7,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "dmg-fire",
        param_id: 1,
        min: 211,
        max: 397
    }, {
        key: "dmg-ltng",
        param_id: 2,
        min: 7,
        max: 477
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 150,
        min: 127,
        max: 364
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 50,
        min: 3490,
        max: 3490
    }, {
        key: "dmg-mag",
        param_id: 5,
        min: 250,
        max: 361
    }],
    requirements: {
        level: 76
    },
    image: {
        invfile: "invmau",
        invtransform: "lgry"
    },
    base: "Ogre Maul",
    set: "Immortal King"
}, {
    id: 77,
    kind: "item.set-item",
    key: "Tal Rasha's Fire-Spun Cloth",
    set_code: "Tal Rasha's Wrappings",
    base_code: "zmb",
    name: "Tal Rasha's Fine-Spun Cloth",
    level: 26,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -20,
        max: -20
    }, {
        key: "mana",
        param_id: 2,
        min: 20,
        max: 40
    }, {
        key: "dex",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dmg-to-mana",
        param_id: 4,
        min: 37,
        max: 37
    }, {
        key: "mag%",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "ac",
        param_id: 1,
        min: 60,
        max: 60
    }, {
        key: "cast2",
        param_id: 2,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 53
    },
    image: {
        invfile: "invmbl",
        invtransform: "dpur"
    },
    base: "Mesh Belt",
    set: "Tal Rasha's Wrappings"
}, {
    id: 78,
    kind: "item.set-item",
    key: "Tal Rasha's Adjudication",
    set_code: "Tal Rasha's Wrappings",
    base_code: "amu",
    name: "Tal Rasha's Adjudication",
    level: 26,
    modifiers: [{
        key: "res-ltng",
        param_id: 1,
        min: 33,
        max: 33
    }, {
        key: "sor",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "hp",
        param_id: 3,
        min: 40,
        max: 60
    }, {
        key: "dmg-ltng",
        param_id: 4,
        min: 3,
        max: 32
    }, {
        key: "mana",
        param_id: 5,
        min: 32,
        max: 52
    }, {
        key: "cast2",
        param_id: 3,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invamu",
        invtransform: "dpur"
    },
    base: "Amulet",
    set: "Tal Rasha's Wrappings"
}, {
    id: 79,
    kind: "item.set-item",
    key: "Tal Rasha's Lidless Eye",
    set_code: "Tal Rasha's Wrappings",
    base_code: "oba",
    name: "Tal Rasha's Lidless Eye",
    level: 26,
    modifiers: [{
        key: "hp",
        param_id: 1,
        min: 57,
        max: 57
    }, {
        key: "mana",
        param_id: 2,
        min: 77,
        max: 77
    }, {
        key: "enr",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "cast3",
        param_id: 4,
        min: 30,
        max: 30
    }, {
        key: "skill",
        param_id: 5,
        param: 61,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 6,
        param: 63,
        min: 2,
        max: 3
    }, {
        key: "skill",
        param_id: 7,
        param: 65,
        min: 2,
        max: 3
    }, {
        key: "sor",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "pierce-fire",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "pierce-ltng",
        param_id: 3,
        min: 15,
        max: 15
    }, {
        key: "extra-cold",
        param_id: 4,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invob5",
        invtransform: "dpur"
    },
    base: "Swirling Crystal",
    set: "Tal Rasha's Wrappings"
}, {
    id: 80,
    kind: "item.set-item",
    key: "Tal Rasha's Howling Wind",
    set_code: "Tal Rasha's Wrappings",
    base_code: "uth",
    name: "Tal Rasha's Guardianship",
    level: 26,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -60,
        max: -60
    }, {
        key: "red-mag",
        param_id: 2,
        min: 12,
        max: 18
    }, {
        key: "mag%",
        param_id: 3,
        min: 70,
        max: 90
    }, {
        key: "res-cold",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "res-fire",
        param_id: 5,
        min: 40,
        max: 40
    }, {
        key: "res-ltng",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "ac",
        param_id: 7,
        min: 400,
        max: 400
    }, {
        key: "cast2",
        param_id: 1,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invgth",
        invtransform: "dpur"
    },
    base: "Lacquered Plate",
    set: "Tal Rasha's Wrappings"
}, {
    id: 81,
    kind: "item.set-item",
    key: "Tal Rasha's Horadric Crest",
    set_code: "Tal Rasha's Wrappings",
    base_code: "xsk",
    name: "Tal Rasha's Horadric Crest",
    level: 26,
    modifiers: [{
        key: "mana",
        param_id: 1,
        min: 25,
        max: 35
    }, {
        key: "hp",
        param_id: 2,
        min: 50,
        max: 65
    }, {
        key: "ac",
        param_id: 3,
        min: 45,
        max: 45
    }, {
        key: "res-all",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 5,
        min: 6,
        max: 10
    }, {
        key: "manasteal",
        param_id: 6,
        min: 6,
        max: 10
    }],
    requirements: {
        level: 66
    },
    image: {
        invfile: "invmsk",
        invtransform: "dpur"
    },
    base: "Death Mask",
    set: "Tal Rasha's Wrappings"
}, {
    id: 82,
    kind: "item.set-item",
    key: "Griswold's Valor",
    set_code: "Griswold's Legacy",
    base_code: "urn",
    name: "Griswold's Valor",
    level: 44,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 50,
        max: 75
    }, {
        key: "abs-cold/lvl",
        param_id: 2,
        min: 2,
        max: 2
    }, {
        key: "sock",
        param_id: 3,
        min: 2,
        max: 3
    }, {
        key: "ease",
        param_id: 4,
        min: -40,
        max: -40
    }, {
        key: "mag%",
        param_id: 5,
        min: 30,
        max: 50
    }, {
        key: "res-all",
        param_id: 6,
        min: 15,
        max: 25
    }, {
        key: "skilltab",
        param_id: 1,
        param: 10,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invcrn",
        invtransform: "dgld"
    },
    base: "Corona",
    set: "Griswold's Legacy"
}, {
    id: 83,
    kind: "item.set-item",
    key: "Griswold's Heart",
    set_code: "Griswold's Legacy",
    base_code: "xar",
    name: "Griswold's Heart",
    level: 44,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 500,
        max: 500
    }, {
        key: "pal",
        param_id: 2,
        min: 1,
        max: 2
    }, {
        key: "sock",
        param_id: 3,
        min: 2,
        max: 3
    }, {
        key: "str",
        param_id: 4,
        min: 10,
        max: 20
    }, {
        key: "ease",
        param_id: 5,
        min: -40,
        max: -40
    }, {
        key: "cast2",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invaar",
        invtransform: "dgld"
    },
    base: "Ornate Plate",
    set: "Griswold's Legacy"
}, {
    id: 84,
    kind: "item.set-item",
    key: "Griswolds's Redemption",
    set_code: "Griswold's Legacy",
    base_code: "7ws",
    name: "Griswold's Redemption",
    level: 44,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 200,
        max: 240
    }, {
        key: "swing2",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "dmg-undead",
        param_id: 3,
        min: 200,
        max: 200
    }, {
        key: "ease",
        param_id: 4,
        min: -20,
        max: -20
    }, {
        key: "sock",
        param_id: 5,
        min: 3,
        max: 5
    }, {
        key: "splash",
        param_id: 6,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "skilltab",
        param_id: 1,
        param: 9,
        min: 2,
        max: 2
    }, {
        key: "dmg-norm",
        param_id: 2,
        min: 10,
        max: 20
    }, {
        key: "dmg-norm",
        param_id: 3,
        min: 10,
        max: 20
    }],
    requirements: {
        level: 53
    },
    image: {
        invfile: "invwsp",
        invtransform: "dgld"
    },
    base: "Caduceus",
    set: "Griswold's Legacy"
}, {
    id: 85,
    kind: "item.set-item",
    key: "Griswold's Honor",
    set_code: "Griswold's Legacy",
    base_code: "paf",
    name: "Griswold's Honor",
    level: 44,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 108,
        max: 108
    }, {
        key: "sock",
        param_id: 2,
        min: 2,
        max: 3
    }, {
        key: "block2",
        param_id: 3,
        min: 65,
        max: 65
    }, {
        key: "block",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "res-all",
        param_id: 5,
        min: 35,
        max: 45
    }, {
        key: "cast2",
        param_id: 6,
        min: 35,
        max: 35
    }, {
        key: "skilltab",
        param_id: 7,
        param: 11,
        min: 2,
        max: 2
    }, {
        key: "balance3",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invpa5",
        invtransform: "dgld"
    },
    base: "Vortex Shield",
    set: "Griswold's Legacy"
}, {
    id: 86,
    kind: "item.set-item",
    key: "Trang-Oul's Guise",
    set_code: "Trang-Oul's Avatar",
    base_code: "uh9",
    name: "Trang-Oul's Guise",
    level: 32,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 80,
        max: 100
    }, {
        key: "balance2",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "thorns",
        param_id: 3,
        min: 420,
        max: 620
    }, {
        key: "mana",
        param_id: 4,
        min: 150,
        max: 150
    }, {
        key: "regen",
        param_id: 5,
        min: 20,
        max: 30
    }, {
        key: "cast2",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invbhm",
        invtransform: "dgld"
    },
    base: "Bone Visage",
    set: "Trang-Oul's Avatar"
}, {
    id: 87,
    kind: "item.set-item",
    key: "Trang-Oul's Scales",
    set_code: "Trang-Oul's Avatar",
    base_code: "xul",
    name: "Trang-Oul's Scales",
    level: 32,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -40,
        max: -40
    }, {
        key: "ac-miss",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "res-pois",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "skilltab",
        param_id: 4,
        param: 8,
        min: 2,
        max: 2
    }, {
        key: "skill",
        param_id: 5,
        param: 367,
        min: 2,
        max: 3
    }, {
        key: "move3",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "ac%",
        param_id: 7,
        min: 150,
        max: 150
    }, {
        key: "res-ltng",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "red-dmg%",
        param_id: 3,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 49
    },
    image: {
        invfile: "invful",
        invtransform: "dyel"
    },
    base: "Chaos Armor",
    set: "Trang-Oul's Avatar"
}, {
    id: 88,
    kind: "item.set-item",
    key: "Trang-Oul's Wing",
    set_code: "Trang-Oul's Avatar",
    base_code: "ne9",
    name: "Trang-Oul's Wing",
    level: 32,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 125,
        max: 125
    }, {
        key: "str",
        param_id: 2,
        min: 20,
        max: 28
    }, {
        key: "dex",
        param_id: 3,
        min: 10,
        max: 18
    }, {
        key: "res-fire",
        param_id: 4,
        min: 38,
        max: 45
    }, {
        key: "block",
        param_id: 5,
        min: 30,
        max: 30
    }, {
        key: "res-pois",
        param_id: 6,
        min: 40,
        max: 40
    }, {
        key: "skilltab",
        param_id: 7,
        param: 7,
        min: 2,
        max: 2
    }, {
        key: "pierce-pois",
        param_id: 2,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 54
    },
    image: {
        invfile: "invne4",
        invtransform: "dyel"
    },
    base: "Cantor Trophy",
    set: "Trang-Oul's Avatar"
}, {
    id: 89,
    kind: "item.set-item",
    key: "Trang-Oul's Claws",
    set_code: "Trang-Oul's Avatar",
    base_code: "xmg",
    name: "Trang-Oul's Claws",
    level: 32,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 30,
        max: 30
    }, {
        key: "cast3",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-cold",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "skilltab",
        param_id: 4,
        param: 6,
        min: 2,
        max: 2
    }, {
        key: "extra-pois",
        param_id: 5,
        min: 10,
        max: 15
    }, {
        key: "oskill",
        param_id: 3,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invmgl",
        invtransform: "dyel"
    },
    base: "Heavy Bracers",
    set: "Trang-Oul's Avatar"
}, {
    id: 90,
    kind: "item.set-item",
    key: "Trang-Oul's Girth",
    set_code: "Trang-Oul's Avatar",
    base_code: "utc",
    name: "Trang-Oul's Girth",
    level: 32,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 75,
        max: 100
    }, {
        key: "stam",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "regen",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "hp",
        param_id: 4,
        min: 56,
        max: 76
    }, {
        key: "nofreeze",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "ease",
        param_id: 6,
        min: -40,
        max: -40
    }, {
        key: "mana",
        param_id: 7,
        min: 25,
        max: 50
    }, {
        key: "res-cold",
        param_id: 2,
        min: 40,
        max: 40
    }],
    requirements: {
        level: 47
    },
    image: {
        invfile: "invtbl",
        invtransform: "dyel"
    },
    base: "Troll Belt",
    set: "Trang-Oul's Avatar"
}, {
    id: 91,
    kind: "item.set-item",
    key: "M'avina's True Sight",
    set_code: "M'avina's Battle Hymn",
    base_code: "ci3",
    name: "M'avina's True Sight",
    level: 21,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 150,
        max: 150
    }, {
        key: "regen",
        param_id: 2,
        min: 5,
        max: 15
    }, {
        key: "swing2",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "mana",
        param_id: 4,
        min: 25,
        max: 45
    }, {
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }, {
        key: "att%",
        param_id: 2,
        min: 50,
        max: 50
    }, {
        key: "res-all",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "extra-fire",
        param_id: 4,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 59
    },
    image: {
        invfile: "invci3",
        invtransform: "whit"
    },
    base: "Diadem",
    set: "M'avina's Battle Hymn"
}, {
    id: 92,
    kind: "item.set-item",
    key: "M'avina's Embrace",
    set_code: "M'avina's Battle Hymn",
    base_code: "uld",
    name: "M'avina's Embrace",
    level: 21,
    modifiers: [{
        key: "gethit-skill",
        param_id: 1,
        param: 55,
        min: 10,
        max: 13
    }, {
        key: "ease",
        param_id: 2,
        min: -30,
        max: -30
    }, {
        key: "red-mag",
        param_id: 3,
        min: 5,
        max: 12
    }, {
        key: "ama",
        param_id: 4,
        min: 1,
        max: 2
    }, {
        key: "ac/lvl",
        param_id: 5,
        param: 32
    }, {
        key: "ac",
        param_id: 6,
        min: 350,
        max: 350
    }, {
        key: "balance2",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "move2",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invfld",
        invtransform: "whit"
    },
    base: "Kraken Shell",
    set: "M'avina's Battle Hymn"
}, {
    id: 93,
    kind: "item.set-item",
    key: "M'avina's Icy Clutch",
    set_code: "M'avina's Battle Hymn",
    base_code: "xtg",
    name: "M'avina's Icy Clutch",
    level: 21,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 45,
        max: 50
    }, {
        key: "dmg-cold",
        param_id: 2,
        param: 150,
        min: 12,
        max: 36
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "gold%",
        param_id: 4,
        min: 56,
        max: 56
    }, {
        key: "str",
        param_id: 5,
        min: 8,
        max: 12
    }, {
        key: "dex",
        param_id: 6,
        min: 10,
        max: 20
    }, {
        key: "dmg-cold",
        param_id: 3,
        param: 100,
        min: 131,
        max: 252
    }, {
        key: "extra-cold",
        param_id: 4,
        min: 5,
        max: 5
    }],
    requirements: {
        level: 32
    },
    image: {
        invfile: "invtgl",
        invtransform: "whit"
    },
    base: "Battle Gauntlets",
    set: "M'avina's Battle Hymn"
}, {
    id: 94,
    kind: "item.set-item",
    key: "M'avina's Tenet",
    set_code: "M'avina's Battle Hymn",
    base_code: "zvb",
    name: "M'avina's Tenet",
    level: 21,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "move2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "manasteal",
        param_id: 3,
        min: 3,
        max: 6
    }, {
        key: "light",
        param_id: 4,
        min: 5,
        max: 5
    }, {
        key: "res-all",
        param_id: 3,
        min: 25,
        max: 25
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invvbl",
        invtransform: "whit"
    },
    base: "Sharkskin Belt",
    set: "M'avina's Battle Hymn"
}, {
    id: 95,
    kind: "item.set-item",
    key: "M'avina's Caster",
    set_code: "M'avina's Battle Hymn",
    base_code: "amc",
    name: "M'avina's Caster",
    level: 21,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 230,
        max: 288
    }, {
        key: "swing3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "att",
        param_id: 3,
        min: 50,
        max: 150
    }, {
        key: "dmg-mag",
        param_id: 1,
        min: 228,
        max: 754
    }, {
        key: "hit-skill",
        param_id: 2,
        min: 10,
        max: 25
    }, {
        key: "skilltab",
        param_id: 3,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 70
    },
    image: {
        invfile: "invam2",
        invtransform: "whit"
    },
    base: "Grand Matron Bow",
    set: "M'avina's Battle Hymn"
}, {
    id: 96,
    kind: "item.set-item",
    key: "Telling of Beads",
    set_code: "The Disciple",
    base_code: "amu",
    name: "Telling of Beads",
    level: 39,
    modifiers: [{
        key: "res-pois",
        param_id: 1,
        min: 35,
        max: 50
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "res-cold",
        param_id: 3,
        min: 18,
        max: 18
    }, {
        key: "thorns",
        param_id: 4,
        min: 24,
        max: 30
    }, {
        key: "mana",
        param_id: 2,
        min: 100,
        max: 100
    }],
    requirements: {
        level: 30
    },
    image: {
        invfile: "invamu",
        invtransform: "lblu"
    },
    base: "Amulet",
    set: "The Disciple"
}, {
    id: 97,
    kind: "item.set-item",
    key: "Laying of Hands",
    set_code: "The Disciple",
    base_code: "ulg",
    name: "Laying of Hands",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 25,
        max: 50
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "res-fire",
        param_id: 3,
        min: 30,
        max: 50
    }, {
        key: "dmg-demon",
        param_id: 4,
        min: 150,
        max: 200
    }, {
        key: "hit-skill",
        param_id: 5,
        param: 101,
        min: 10,
        max: 13
    }, {
        key: "dmg-pois",
        param_id: 1,
        param: 50,
        min: 1127,
        max: 1127
    }],
    requirements: {
        level: 63
    },
    image: {
        invfile: "invlgl",
        invtransform: "lblu"
    },
    base: "Bramble Mitts",
    set: "The Disciple"
}, {
    id: 98,
    kind: "item.set-item",
    key: "Rite of Passage",
    set_code: "The Disciple",
    base_code: "xlb",
    name: "Rite of Passage",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 25,
        max: 25
    }, {
        key: "move3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "nofreeze",
        param_id: 3,
        min: 1,
        max: 1
    }, {
        key: "stam",
        param_id: 4,
        min: 15,
        max: 25
    }, {
        key: "balance2",
        param_id: 2,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invlbt",
        invtransform: "lblu"
    },
    base: "Demonhide Boots",
    set: "The Disciple"
}, {
    id: 99,
    kind: "item.set-item",
    key: "Spiritual Custodian",
    set_code: "The Disciple",
    base_code: "uui",
    name: "Dark Adherent",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 305,
        max: 415
    }, {
        key: "res-fire",
        param_id: 2,
        min: 40,
        max: 55
    }, {
        key: "gethit-skill",
        param_id: 3,
        param: 48,
        min: 25,
        max: 23
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 50,
        min: 2458,
        max: 3482
    }, {
        key: "dmg-undead",
        param_id: 5,
        min: 200,
        max: 250
    }, {
        key: "gethit-skill",
        param_id: 2,
        min: 5,
        max: 18
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invqlt",
        invtransform: "lblu"
    },
    base: "Dusk Shroud",
    set: "The Disciple"
}, {
    id: 100,
    kind: "item.set-item",
    key: "Credendum",
    set_code: "The Disciple",
    base_code: "umc",
    name: "Credendum",
    level: 39,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "str",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "dex",
        param_id: 3,
        min: 10,
        max: 10
    }, {
        key: "res-all",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "balance2",
        param_id: 2,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 65
    },
    image: {
        invfile: "invmbl",
        invtransform: "lblu"
    },
    base: "Mithril Coil",
    set: "The Disciple"
}, {
    id: 101,
    kind: "item.set-item",
    key: "Dangoon's Teaching",
    set_code: "Heaven's Brethren",
    base_code: "7ma",
    name: "Dangoon's Teaching",
    level: 55,
    modifiers: [{
        key: "dmg/lvl",
        param_id: 1,
        param: 12
    }, {
        key: "swing3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 44,
        min: 33,
        max: 31
    }, {
        key: "fire-min",
        param_id: 4,
        min: 40,
        max: 60
    }, {
        key: "fire-max",
        param_id: 5,
        min: 70,
        max: 100
    }, {
        key: "splash",
        param_id: 6,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "allskills",
        param_id: 2,
        min: 2,
        max: 2
    }],
    requirements: {
        level: 68
    },
    image: {
        invfile: "invmac",
        invtransform: ""
    },
    base: "Reinforced Mace",
    set: "Heaven's Brethren"
}, {
    id: 102,
    kind: "item.set-item",
    key: "Heaven's Taebaek",
    set_code: "Heaven's Brethren",
    base_code: "uts",
    name: "Taebaek's Glory",
    level: 55,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 300,
        max: 500
    }, {
        key: "mana",
        param_id: 2,
        min: 100,
        max: 120
    }, {
        key: "res-ltng",
        param_id: 3,
        min: 25,
        max: 30
    }, {
        key: "thorns",
        param_id: 4,
        min: 380,
        max: 560
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "block",
        param_id: 6,
        min: 25,
        max: 25
    }, {
        key: "block3",
        param_id: 7,
        min: 30,
        max: 30
    }, {
        key: "cast2",
        param_id: 8,
        min: 40,
        max: 40
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 81
    },
    image: {
        invfile: "invgts",
        invtransform: ""
    },
    base: "Ward",
    set: "Heaven's Brethren"
}, {
    id: 103,
    kind: "item.set-item",
    key: "Haemosu's Adament",
    set_code: "Heaven's Brethren",
    base_code: "xrs",
    name: "Haemosu's Adamant",
    level: 55,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 500,
        max: 500
    }, {
        key: "ac-miss",
        param_id: 2,
        min: 200,
        max: 250
    }, {
        key: "hp",
        param_id: 3,
        min: 50,
        max: 100
    }, {
        key: "ac-hth",
        param_id: 4,
        min: 200,
        max: 250
    }, {
        key: "ease",
        param_id: 5,
        min: -20,
        max: -20
    }, {
        key: "allskills",
        param_id: 6,
        min: 1,
        max: 1
    }, {
        key: "cast2",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 44
    },
    image: {
        invfile: "invbrs",
        invtransform: ""
    },
    base: "Cuirass",
    set: "Heaven's Brethren"
}, {
    id: 104,
    kind: "item.set-item",
    key: "Ondal's Almighty",
    set_code: "Heaven's Brethren",
    base_code: "uhm",
    name: "Ondal's Almighty",
    level: 55,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 50,
        max: 150
    }, {
        key: "ease",
        param_id: 2,
        min: -15,
        max: -15
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 72,
        min: 10,
        max: 13
    }, {
        key: "str",
        param_id: 4,
        min: 10,
        max: 15
    }, {
        key: "dex",
        param_id: 5,
        min: 10,
        max: 20
    }, {
        key: "balance3",
        param_id: 6,
        min: 24,
        max: 24
    }, {
        key: "allskills",
        param_id: 7,
        min: 1,
        max: 2
    }, {
        key: "cast2",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invghm",
        invtransform: ""
    },
    base: "Spired Helm",
    set: "Heaven's Brethren"
}, {
    id: 105,
    kind: "item.set-item",
    key: "Guillaume's Face",
    set_code: "Orphan's Call",
    base_code: "xhm",
    name: "Guillaume's Face",
    level: 41,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 120,
        max: 120
    }, {
        key: "balance3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "crush",
        param_id: 3,
        min: 35,
        max: 35
    }, {
        key: "deadly",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "str",
        param_id: 5,
        min: 15,
        max: 15
    }, {
        key: "reduce-ac",
        param_id: 2,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 34
    },
    image: {
        invfile: "invghm",
        invtransform: "lgry"
    },
    base: "Winged Helm",
    set: "Orphan's Call"
}, {
    id: 106,
    kind: "item.set-item",
    key: "Wilhelm's Pride",
    set_code: "Orphan's Call",
    base_code: "ztb",
    name: "Wilhelm's Pride",
    level: 41,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "manasteal",
        param_id: 2,
        min: 4,
        max: 6
    }, {
        key: "res-cold",
        param_id: 3,
        min: 10,
        max: 20
    }, {
        key: "lifesteal",
        param_id: 4,
        min: 4,
        max: 6
    }, {
        key: "dmg-demon",
        param_id: 2,
        min: 150,
        max: 150
    }],
    requirements: {
        level: 42
    },
    image: {
        invfile: "invtbl",
        invtransform: "lgry"
    },
    base: "Battle Belt",
    set: "Orphan's Call"
}, {
    id: 107,
    kind: "item.set-item",
    key: "Magnus' Skin",
    set_code: "Orphan's Call",
    base_code: "xvg",
    name: "Magnus' Skin",
    level: 41,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "res-fire",
        param_id: 2,
        min: 15,
        max: 15
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "light",
        param_id: 4,
        min: 3,
        max: 3
    }, {
        key: "att",
        param_id: 5,
        min: 100,
        max: 100
    }, {
        key: "pierce",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "dmg-undead",
        param_id: 2,
        min: 150,
        max: 150
    }],
    requirements: {
        level: 37
    },
    image: {
        invfile: "invvgl",
        invtransform: "lgry"
    },
    base: "Sharkskin Gloves",
    set: "Orphan's Call"
}, {
    id: 108,
    kind: "item.set-item",
    key: "Wihtstan's Guard",
    set_code: "Orphan's Call",
    base_code: "xml",
    name: "Whitstan's Guard",
    level: 41,
    modifiers: [{
        key: "ac%",
        param_id: 1,
        min: 175,
        max: 175
    }, {
        key: "block3",
        param_id: 2,
        min: 40,
        max: 40
    }, {
        key: "block",
        param_id: 3,
        min: 55,
        max: 55
    }, {
        key: "half-freeze",
        param_id: 4,
        min: 1,
        max: 1
    }, {
        key: "light",
        param_id: 5,
        min: 5,
        max: 5
    }, {
        key: "dmg%",
        param_id: 2,
        min: 150,
        max: 150
    }],
    requirements: {
        level: 29
    },
    image: {
        invfile: "invsml",
        invtransform: "lgry"
    },
    base: "Round Shield",
    set: "Orphan's Call"
}, {
    id: 109,
    kind: "item.set-item",
    key: "Hwanin's Splendor",
    set_code: "Hwanin's Majesty",
    base_code: "xrn",
    name: "Hwanin's Splendor",
    level: 28,
    modifiers: [{
        key: "regen",
        param_id: 1,
        min: 30,
        max: 40
    }, {
        key: "red-mag",
        param_id: 2,
        min: 10,
        max: 10
    }, {
        key: "res-cold",
        param_id: 3,
        min: 37,
        max: 37
    }, {
        key: "ac%",
        param_id: 4,
        min: 100,
        max: 150
    }, {
        key: "att",
        param_id: 5,
        min: 200,
        max: 350
    }],
    requirements: {
        level: 45
    },
    image: {
        invfile: "invcrn",
        invtransform: ""
    },
    base: "Grand Crown",
    set: "Hwanin's Majesty"
}, {
    id: 110,
    kind: "item.set-item",
    key: "Hwanin's Refuge",
    set_code: "Hwanin's Majesty",
    base_code: "xcl",
    name: "Hwanin's Refuge",
    level: 28,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 200,
        max: 200
    }, {
        key: "res-pois",
        param_id: 2,
        min: 27,
        max: 27
    }, {
        key: "hp",
        param_id: 3,
        min: 100,
        max: 100
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 42,
        min: 20,
        max: 9
    }],
    requirements: {
        level: 30
    },
    image: {
        invfile: "invscl",
        invtransform: ""
    },
    base: "Tigulated Mail",
    set: "Hwanin's Majesty"
}, {
    id: 111,
    kind: "item.set-item",
    key: "Hwanin's Seal",
    set_code: "Hwanin's Majesty",
    base_code: "mbl",
    name: "Hwanin's Blessing",
    level: 28,
    modifiers: [{
        key: "dmg-ltng",
        param_id: 1,
        min: 3,
        max: 330
    }, {
        key: "noheal",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "ac/lvl",
        param_id: 3,
        param: 12
    }, {
        key: "dmg-to-mana",
        param_id: 4,
        min: 12,
        max: 12
    }, {
        key: "abs-ltng%",
        param_id: 5,
        min: 4,
        max: 6
    }],
    requirements: {
        level: 35
    },
    image: {
        invfile: "invmbl",
        invtransform: ""
    },
    base: "Belt",
    set: "Hwanin's Majesty"
}, {
    id: 112,
    kind: "item.set-item",
    key: "Hwanin's Justice",
    set_code: "Hwanin's Majesty",
    base_code: "9vo",
    name: "Hwanin's Justice",
    level: 28,
    modifiers: [{
        key: "att",
        param_id: 1,
        min: 330,
        max: 330
    }, {
        key: "indestruct",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "hit-skill",
        param_id: 3,
        param: 45,
        min: 10,
        max: 3
    }, {
        key: "swing3",
        param_id: 4,
        min: 40,
        max: 40
    }, {
        key: "dmg%",
        param_id: 5,
        min: 200,
        max: 250
    }, {
        key: "dmg-ltng",
        param_id: 6,
        min: 5,
        max: 25
    }, {
        key: "splash",
        param_id: 7,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "hit-skill",
        param_id: 1,
        min: 20,
        max: 16
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invvou",
        invtransform: ""
    },
    base: "Bill",
    set: "Hwanin's Majesty"
}, {
    id: 113,
    kind: "item.set-item",
    key: "Sazabi's Cobalt Redeemer",
    set_code: "Sazabi's Grand Tribute",
    base_code: "7ls",
    name: "Sazabi's Cobalt Redeemer",
    level: 34,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 150,
        max: 250
    }, {
        key: "dmg-cold",
        param_id: 2,
        param: 50,
        min: 175,
        max: 250
    }, {
        key: "swing3",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "dmg-demon",
        param_id: 4,
        min: 318,
        max: 318
    }, {
        key: "indestruct",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "dex",
        param_id: 6,
        min: 15,
        max: 15
    }, {
        key: "str",
        param_id: 7,
        min: 5,
        max: 5
    }, {
        key: "splash",
        param_id: 8,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "ethereal",
        param_id: 9,
        min: 1,
        max: 1
    }, {
        key: "heal-kill",
        param_id: 1,
        min: 10,
        max: 14
    }],
    requirements: {
        level: 73
    },
    image: {
        invfile: "invlsd",
        invtransform: "dblu"
    },
    base: "Cryptic Sword",
    set: "Sazabi's Grand Tribute"
}, {
    id: 114,
    kind: "item.set-item",
    key: "Sazabi's Ghost Liberator",
    set_code: "Sazabi's Grand Tribute",
    base_code: "upl",
    name: "Sazabi's Ghost Liberator",
    level: 34,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 400,
        max: 400
    }, {
        key: "balance3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "str",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "att-demon",
        param_id: 4,
        min: 300,
        max: 300
    }, {
        key: "hp",
        param_id: 5,
        min: 50,
        max: 75
    }, {
        key: "dmg-demon",
        param_id: 6,
        min: 100,
        max: 150
    }, {
        key: "regen",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 67
    },
    image: {
        invfile: "invspl",
        invtransform: "dblu"
    },
    base: "Balrog Skin",
    set: "Sazabi's Grand Tribute"
}, {
    id: 115,
    kind: "item.set-item",
    key: "Sazabi's Mental Sheath",
    set_code: "Sazabi's Grand Tribute",
    base_code: "xhl",
    name: "Sazabi's Mental Sheath",
    level: 34,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 100,
        max: 100
    }, {
        key: "allskills",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "res-fire",
        param_id: 3,
        min: 15,
        max: 20
    }, {
        key: "res-ltng",
        param_id: 4,
        min: 15,
        max: 20
    }, {
        key: "regen",
        param_id: 1,
        min: 15,
        max: 15
    }],
    requirements: {
        level: 43
    },
    image: {
        invfile: "invfhl",
        invtransform: "dblu"
    },
    base: "Basinet",
    set: "Sazabi's Grand Tribute"
}, {
    id: 116,
    kind: "item.set-item",
    key: "Bul-Kathos' Sacred Charge",
    set_code: "Bul-Kathos' Children",
    base_code: "7gd",
    name: "Bul-Kathos' Sacred Charge",
    level: 50,
    modifiers: [{
        key: "crush",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "res-all",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 4,
        min: 200,
        max: 250
    }, {
        key: "splash",
        param_id: 5,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "swing2",
        param_id: 1,
        min: 30,
        max: 30
    }],
    requirements: {
        level: 61
    },
    image: {
        invfile: "invgsd",
        invtransform: "dgrn"
    },
    base: "Colossus Blade",
    set: "Bul-Kathos' Children"
}, {
    id: 117,
    kind: "item.set-item",
    key: "Bul-Kathos' Tribal Guardian",
    set_code: "Bul-Kathos' Children",
    base_code: "7fb",
    name: "Bul-Kathos' Tribal Guardian",
    level: 50,
    modifiers: [{
        key: "res-cold",
        param_id: 1,
        min: 50,
        max: 50
    }, {
        key: "dmg-pois",
        param_id: 2,
        param: 50,
        min: 2560,
        max: 2560
    }, {
        key: "swing2",
        param_id: 3,
        min: 20,
        max: 20
    }, {
        key: "str",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg%",
        param_id: 5,
        min: 225,
        max: 275
    }, {
        key: "splash",
        param_id: 6,
        param: 358,
        min: 100,
        max: 1
    }, {
        key: "deadly",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 54
    },
    image: {
        invfile: "invflb",
        invtransform: "dgrn"
    },
    base: "Colossus Sword",
    set: "Bul-Kathos' Children"
}, {
    id: 118,
    kind: "item.set-item",
    key: "Bul-Kathos' Death Band",
    set_code: "Bul-Kathos' Children",
    base_code: "rin",
    name: "Bul-Kathos' Death Band",
    level: 50,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        min: 20,
        max: 30
    }, {
        key: "att",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "res-ltng",
        param_id: 3,
        min: 15,
        max: 25
    }, {
        key: "red-dmg%",
        param_id: 4,
        min: 6,
        max: 8
    }, {
        key: "nofreeze",
        param_id: 1,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 69
    },
    image: {
        invfile: "invrin",
        invtransform: "dgrn"
    },
    base: "Ring",
    set: "Bul-Kathos' Children"
}, {
    id: 119,
    kind: "item.set-item",
    key: "Cow King's Horns",
    set_code: "Cow King's Leathers",
    base_code: "xap",
    name: "Cow King's Horns",
    level: 20,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "nofreeze",
        param_id: 2,
        min: 1,
        max: 1
    }, {
        key: "dmg-to-mana",
        param_id: 3,
        min: 35,
        max: 35
    }, {
        key: "thorns",
        param_id: 4,
        min: 10,
        max: 10
    }, {
        key: "allskills",
        param_id: 5,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invcap",
        invtransform: ""
    },
    base: "War Hat",
    set: "Cow King's Leathers"
}, {
    id: 120,
    kind: "item.set-item",
    key: "Cow King's Hide",
    set_code: "Cow King's Leathers",
    base_code: "stu",
    name: "Cow King's Hide",
    level: 20,
    modifiers: [{
        key: "res-all",
        param_id: 1,
        min: 15,
        max: 25
    }, {
        key: "ac%",
        param_id: 2,
        min: 60,
        max: 60
    }, {
        key: "hp",
        param_id: 3,
        min: 30,
        max: 30
    }, {
        key: "gethit-skill",
        param_id: 4,
        param: 53,
        min: 18,
        max: 5
    }],
    requirements: {
        level: 18
    },
    image: {
        invfile: "invstu",
        invtransform: ""
    },
    base: "Studded Leather",
    set: "Cow King's Leathers"
}, {
    id: 121,
    kind: "item.set-item",
    key: "Cow King's Hoofs",
    set_code: "Cow King's Leathers",
    base_code: "vbt",
    name: "Cow King's Hooves",
    level: 20,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 25,
        max: 35
    }, {
        key: "move3",
        param_id: 2,
        min: 30,
        max: 30
    }, {
        key: "mag%",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "dex",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg-fire",
        param_id: 5,
        min: 25,
        max: 35
    }],
    requirements: {
        level: 13
    },
    image: {
        invfile: "invvbt",
        invtransform: ""
    },
    base: "Heavy Boots",
    set: "Cow King's Leathers"
}, {
    id: 122,
    kind: "item.set-item",
    key: "Naj's Puzzler",
    set_code: "Naj's Ancient Set",
    base_code: "6cs",
    name: "Naj's Puzzler",
    level: 43,
    modifiers: [{
        key: "enr",
        param_id: 1,
        min: 35,
        max: 35
    }, {
        key: "dmg%",
        param_id: 2,
        min: 150,
        max: 150
    }, {
        key: "charged",
        param_id: 3,
        param: 357,
        min: 3,
        max: 1
    }, {
        key: "cast3",
        param_id: 4,
        min: 50,
        max: 50
    }, {
        key: "dmg-ltng",
        param_id: 5,
        min: 6,
        max: 450
    }, {
        key: "mana",
        param_id: 6,
        min: 70,
        max: 70
    }, {
        key: "allskills",
        param_id: 7,
        min: 3,
        max: 3
    }, {
        key: "rep-charge",
        param_id: 8,
        param: 33
    }, {
        key: "splash",
        param_id: 9,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 78
    },
    image: {
        invfile: "invcst",
        invtransform: ""
    },
    base: "Elder Staff",
    set: "Naj's Ancient Vestige"
}, {
    id: 123,
    kind: "item.set-item",
    key: "Naj's Light Plate",
    set_code: "Naj's Ancient Set",
    base_code: "ult",
    name: "Naj's Light Plate",
    level: 43,
    modifiers: [{
        key: "ease",
        param_id: 1,
        min: -60,
        max: -60
    }, {
        key: "hp",
        param_id: 2,
        min: 65,
        max: 65
    }, {
        key: "res-all",
        param_id: 3,
        min: 25,
        max: 25
    }, {
        key: "dmg-to-mana",
        param_id: 4,
        min: 45,
        max: 45
    }, {
        key: "allskills",
        param_id: 5,
        min: 1,
        max: 1
    }, {
        key: "ac",
        param_id: 6,
        min: 300,
        max: 300
    }, {
        key: "cast2",
        param_id: 1,
        min: 20,
        max: 20
    }],
    requirements: {
        level: 71
    },
    image: {
        invfile: "invplt",
        invtransform: ""
    },
    base: "Hellforge Plate",
    set: "Naj's Ancient Vestige"
}, {
    id: 124,
    kind: "item.set-item",
    key: "Naj's Circlet",
    set_code: "Naj's Ancient Set",
    base_code: "ci0",
    name: "Naj's Circlet",
    level: 43,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 75,
        max: 75
    }, {
        key: "dmg-fire",
        param_id: 2,
        min: 25,
        max: 35
    }, {
        key: "Light",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "str",
        param_id: 4,
        min: 15,
        max: 15
    }, {
        key: "gethit-skill",
        param_id: 5,
        param: 53,
        min: 12,
        max: 5
    }, {
        key: "cast2",
        param_id: 6,
        min: 20,
        max: 20
    }, {
        key: "allskills",
        param_id: 1,
        min: 1,
        max: 1
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invci0",
        invtransform: ""
    },
    base: "Circlet",
    set: "Naj's Ancient Vestige"
}, {
    id: 125,
    kind: "item.set-item",
    key: "McAuley's Paragon",
    set_code: "McAuley's Folly",
    base_code: "cap",
    name: "Sander's Paragon",
    level: 20,
    modifiers: [{
        key: "mag%",
        param_id: 1,
        min: 35,
        max: 70
    }, {
        key: "thorns",
        param_id: 2,
        min: 8,
        max: 8
    }, {
        key: "ac/lvl",
        param_id: 3,
        param: 8
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invcap",
        invtransform: "lpur"
    },
    base: "Cap",
    set: "Sander's Folly"
}, {
    id: 126,
    kind: "item.set-item",
    key: "McAuley's Riprap",
    set_code: "McAuley's Folly",
    base_code: "vbt",
    name: "Sander's Riprap",
    level: 20,
    modifiers: [{
        key: "move3",
        param_id: 1,
        min: 40,
        max: 40
    }, {
        key: "att",
        param_id: 2,
        min: 100,
        max: 100
    }, {
        key: "str",
        param_id: 3,
        min: 5,
        max: 5
    }, {
        key: "dex",
        param_id: 4,
        min: 10,
        max: 10
    }],
    requirements: {
        level: 20
    },
    image: {
        invfile: "invvbt",
        invtransform: "lpur"
    },
    base: "Heavy Boots",
    set: "Sander's Folly"
}, {
    id: 127,
    kind: "item.set-item",
    key: "McAuley's Taboo",
    set_code: "McAuley's Folly",
    base_code: "vgl",
    name: "Sander's Taboo",
    level: 20,
    modifiers: [{
        key: "ac",
        param_id: 1,
        min: 20,
        max: 25
    }, {
        key: "swing2",
        param_id: 2,
        min: 20,
        max: 20
    }, {
        key: "hp",
        param_id: 3,
        min: 40,
        max: 40
    }, {
        key: "dmg-pois",
        param_id: 4,
        param: 75,
        min: 92,
        max: 113
    }],
    requirements: {
        level: 28
    },
    image: {
        invfile: "invvgl",
        invtransform: "lpur"
    },
    base: "Heavy Gloves",
    set: "Sander's Folly"
}, {
    id: 128,
    kind: "item.set-item",
    key: "McAuley's Superstition",
    set_code: "McAuley's Folly",
    base_code: "bwn",
    name: "Sander's Superstition",
    level: 20,
    modifiers: [{
        key: "dmg%",
        param_id: 1,
        param: 2,
        min: 75,
        max: 75
    }, {
        key: "mana",
        param_id: 2,
        min: 25,
        max: 25
    }, {
        key: "manasteal",
        param_id: 3,
        min: 8,
        max: 8
    }, {
        key: "cast3",
        param_id: 4,
        min: 20,
        max: 20
    }, {
        key: "dmg-cold",
        param_id: 5,
        param: 50,
        min: 25,
        max: 75
    }, {
        key: "allskills",
        param_id: 1,
        min: 2,
        max: 2
    }, {
        key: "splash",
        param_id: 1,
        param: 358,
        min: 100,
        max: 1
    }],
    requirements: {
        level: 25
    },
    image: {
        invfile: "invbwn",
        invtransform: "lpur"
    },
    base: "Bone Wand",
    set: "Sander's Folly"
}];

export const allItems = [...uniqueItems, ...setItems];

