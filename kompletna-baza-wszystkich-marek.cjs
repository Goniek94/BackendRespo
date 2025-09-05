const mongoose = require('mongoose');
require('dotenv').config();

// Kompletna baza danych wszystkich popularnych marek samochodów
const completeCarDatabase = [
    // NIEMIECKIE MARKI
    {
        brand: "Audi",
        models: [
            { name: "A1", generations: ["8X (2010-2018)", "GB (2018-obecnie)"] },
            { name: "A3", generations: ["8L (1996-2003)", "8P (2003-2012)", "8V (2012-2020)", "8Y (2020-obecnie)"] },
            { name: "A4", generations: ["B5 (1994-2001)", "B6 (2000-2006)", "B7 (2004-2008)", "B8 (2007-2015)", "B9 (2015-obecnie)"] },
            { name: "A5", generations: ["8T (2007-2016)", "F5 (2016-obecnie)"] },
            { name: "A6", generations: ["C4 (1994-1997)", "C5 (1997-2004)", "C6 (2004-2011)", "C7 (2011-2018)", "C8 (2018-obecnie)"] },
            { name: "A7", generations: ["4G (2010-2018)", "4K (2018-obecnie)"] },
            { name: "A8", generations: ["D2 (1994-2002)", "D3 (2002-2010)", "D4 (2009-2017)", "D5 (2017-obecnie)"] },
            { name: "Q3", generations: ["8U (2011-2018)", "F3 (2018-obecnie)"] },
            { name: "Q5", generations: ["8R (2008-2017)", "FY (2017-obecnie)"] },
            { name: "Q7", generations: ["4L (2005-2015)", "4M (2015-obecnie)"] },
            { name: "Q8", generations: ["4M (2018-obecnie)"] },
            { name: "TT", generations: ["8N (1998-2006)", "8J (2006-2014)", "8S (2014-2023)"] },
            { name: "R8", generations: ["42 (2006-2015)", "4S (2015-obecnie)"] }
        ]
    },
    {
        brand: "BMW",
        models: [
            { name: "Seria 1", generations: ["E81/E82/E87/E88 (2004-2013)", "F20/F21 (2011-2019)", "F40 (2019-obecnie)"] },
            { name: "Seria 2", generations: ["F22/F23 (2013-2021)", "G42 (2021-obecnie)", "F45/F46 (2014-2021)", "U06 (2021-obecnie)"] },
            { name: "Seria 3", generations: ["E30 (1982-1994)", "E36 (1990-2000)", "E46 (1998-2006)", "E90/E91/E92/E93 (2005-2013)", "F30/F31/F34/F35 (2012-2019)", "G20/G21 (2019-obecnie)"] },
            { name: "Seria 4", generations: ["F32/F33/F36 (2013-2020)", "G22/G23/G26 (2020-obecnie)"] },
            { name: "Seria 5", generations: ["E34 (1988-1996)", "E39 (1995-2003)", "E60/E61 (2003-2010)", "F10/F11/F07 (2009-2017)", "G30/G31 (2016-obecnie)"] },
            { name: "Seria 6", generations: ["E24 (1976-1989)", "E63/E64 (2003-2010)", "F12/F13/F06 (2011-2018)"] },
            { name: "Seria 7", generations: ["E32 (1986-1994)", "E38 (1994-2001)", "E65/E66 (2001-2008)", "F01/F02 (2008-2015)", "G11/G12 (2015-2022)", "G70 (2022-obecnie)"] },
            { name: "Seria 8", generations: ["E31 (1989-1999)", "G14/G15/G16 (2018-obecnie)"] },
            { name: "X1", generations: ["E84 (2009-2015)", "F48 (2015-2022)", "U11 (2022-obecnie)"] },
            { name: "X2", generations: ["F39 (2017-obecnie)"] },
            { name: "X3", generations: ["E83 (2003-2010)", "F25 (2010-2017)", "G01 (2017-obecnie)"] },
            { name: "X4", generations: ["F26 (2014-2018)", "G02 (2018-obecnie)"] },
            { name: "X5", generations: ["E53 (1999-2006)", "E70 (2006-2013)", "F15 (2013-2018)", "G05 (2018-obecnie)"] },
            { name: "X6", generations: ["E71 (2008-2014)", "F16 (2014-2019)", "G06 (2019-obecnie)"] },
            { name: "X7", generations: ["G07 (2018-obecnie)"] },
            { name: "Z3", generations: ["E36/7 (1995-2002)"] },
            { name: "Z4", generations: ["E85/E86 (2002-2008)", "E89 (2009-2016)", "G29 (2018-obecnie)"] }
        ]
    },
    {
        brand: "Mercedes-Benz",
        models: [
            { name: "Klasa A", generations: ["W168 (1997-2004)", "W169 (2004-2012)", "W176 (2012-2018)", "W177 (2018-obecnie)"] },
            { name: "Klasa B", generations: ["W245 (2005-2011)", "W246 (2011-2018)", "W247 (2018-obecnie)"] },
            { name: "Klasa C", generations: ["W202 (1993-2000)", "W203 (2000-2007)", "W204 (2007-2014)", "W205 (2014-2021)", "W206 (2021-obecnie)"] },
            { name: "CLA", generations: ["C117 (2013-2019)", "C118 (2019-obecnie)"] },
            { name: "CLS", generations: ["C219 (2004-2010)", "C218 (2010-2018)", "C257 (2018-obecnie)"] },
            { name: "Klasa E", generations: ["W124 (1984-1997)", "W210 (1995-2003)", "W211 (2002-2009)", "W212 (2009-2016)", "W213 (2016-obecnie)"] },
            { name: "Klasa G", generations: ["W460 (1979-1991)", "W461 (1990-obecnie)", "W463 (1990-2018)", "W464 (2018-obecnie)"] },
            { name: "GLA", generations: ["X156 (2013-2020)", "H247 (2020-obecnie)"] },
            { name: "GLB", generations: ["X247 (2019-obecnie)"] },
            { name: "GLC", generations: ["C253 (2015-2022)", "X253 (2015-2022)", "C254 (2022-obecnie)", "X254 (2022-obecnie)"] },
            { name: "GLE", generations: ["W166 (2011-2019)", "V167 (2019-obecnie)"] },
            { name: "GLS", generations: ["X166 (2015-2019)", "X167 (2019-obecnie)"] },
            { name: "Klasa S", generations: ["W140 (1991-1998)", "W220 (1998-2005)", "W221 (2005-2013)", "W222 (2013-2020)", "W223 (2020-obecnie)"] },
            { name: "SL", generations: ["R129 (1989-2001)", "R230 (2001-2012)", "R231 (2012-2020)", "R232 (2021-obecnie)"] },
            { name: "SLK/SLC", generations: ["R170 (1996-2004)", "R171 (2004-2011)", "R172 (2011-2020)"] }
        ]
    },
    {
        brand: "Volkswagen",
        models: [
            { name: "Polo", generations: ["86 (1975-1981)", "86C (1981-1994)", "6N (1994-2002)", "9N (2001-2009)", "6R (2009-2017)", "AW (2017-obecnie)"] },
            { name: "Golf", generations: ["Golf I (1974-1983)", "Golf II (1983-1992)", "Golf III (1991-1997)", "Golf IV (1997-2006)", "Golf V (2003-2009)", "Golf VI (2008-2013)", "Golf VII (2012-2020)", "Golf VIII (2019-obecnie)"] },
            { name: "Jetta", generations: ["A1 (1979-1984)", "A2 (1984-1992)", "A3 (1992-1998)", "A4 (1998-2005)", "A5 (2005-2010)", "A6 (2010-2018)", "A7 (2018-obecnie)"] },
            { name: "Passat", generations: ["B1 (1973-1980)", "B2 (1980-1988)", "B3 (1988-1993)", "B4 (1993-1997)", "B5 (1996-2005)", "B6 (2005-2010)", "B7 (2010-2014)", "B8 (2014-obecnie)"] },
            { name: "Arteon", generations: ["3H (2017-obecnie)"] },
            { name: "Tiguan", generations: ["5N (2007-2016)", "AD1 (2016-obecnie)"] },
            { name: "Touareg", generations: ["7L (2002-2010)", "7P (2010-2018)", "CR (2018-obecnie)"] },
            { name: "T-Cross", generations: ["C1 (2018-obecnie)"] },
            { name: "T-Roc", generations: ["A1 (2017-obecnie)"] },
            { name: "ID.3", generations: ["E1 (2019-obecnie)"] },
            { name: "ID.4", generations: ["E2 (2020-obecnie)"] }
        ]
    },
    {
        brand: "Porsche",
        models: [
            { name: "911", generations: ["901/911 (1963-1973)", "G (1973-1989)", "964 (1988-1994)", "993 (1993-1998)", "996 (1997-2006)", "997 (2004-2012)", "991 (2011-2019)", "992 (2019-obecnie)"] },
            { name: "Boxster", generations: ["986 (1996-2004)", "987 (2004-2012)", "981 (2012-2016)", "982 (2016-obecnie)"] },
            { name: "Cayman", generations: ["987 (2005-2012)", "981 (2012-2016)", "982 (2016-obecnie)"] },
            { name: "Cayenne", generations: ["955/957 (2002-2010)", "958 (2010-2017)", "9YA (2017-obecnie)"] },
            { name: "Macan", generations: ["95B (2014-obecnie)"] },
            { name: "Panamera", generations: ["970 (2009-2016)", "971 (2016-obecnie)"] },
            { name: "Taycan", generations: ["J1 (2019-obecnie)"] }
        ]
    },

    // FRANCUSKIE MARKI
    {
        brand: "Renault",
        models: [
            { name: "Clio", generations: ["I (1990-1998)", "II (1998-2012)", "III (2005-2014)", "IV (2012-2019)", "V (2019-obecnie)"] },
            { name: "Megane", generations: ["I (1995-2003)", "II (2002-2009)", "III (2008-2016)", "IV (2015-obecnie)"] },
            { name: "Laguna", generations: ["I (1993-2001)", "II (2000-2007)", "III (2007-2015)"] },
            { name: "Scenic", generations: ["I (1996-2003)", "II (2003-2009)", "III (2009-2016)", "IV (2016-obecnie)"] },
            { name: "Captur", generations: ["I (2013-2019)", "II (2019-obecnie)"] },
            { name: "Kadjar", generations: ["I (2015-2022)"] },
            { name: "Koleos", generations: ["I (2008-2015)", "II (2016-obecnie)"] },
            { name: "Talisman", generations: ["I (2015-2022)"] },
            { name: "Twingo", generations: ["I (1992-2007)", "II (2007-2014)", "III (2014-2024)"] }
        ]
    },
    {
        brand: "Peugeot",
        models: [
            { name: "106", generations: ["I (1991-2003)"] },
            { name: "107", generations: ["I (2005-2014)"] },
            { name: "108", generations: ["I (2014-2021)"] },
            { name: "206", generations: ["I (1998-2012)"] },
            { name: "207", generations: ["I (2006-2014)"] },
            { name: "208", generations: ["I (2012-2019)", "II (2019-obecnie)"] },
            { name: "306", generations: ["I (1993-2001)"] },
            { name: "307", generations: ["I (2001-2008)"] },
            { name: "308", generations: ["I (2007-2013)", "II (2013-2021)", "III (2021-obecnie)"] },
            { name: "406", generations: ["I (1995-2004)"] },
            { name: "407", generations: ["I (2004-2010)"] },
            { name: "508", generations: ["I (2010-2018)", "II (2018-obecnie)"] },
            { name: "2008", generations: ["I (2013-2019)", "II (2019-obecnie)"] },
            { name: "3008", generations: ["I (2008-2016)", "II (2016-obecnie)"] },
            { name: "5008", generations: ["I (2009-2017)", "II (2017-obecnie)"] }
        ]
    },
    {
        brand: "Citroen",
        models: [
            { name: "C1", generations: ["I (2005-2014)", "II (2014-2022)"] },
            { name: "C2", generations: ["I (2003-2009)"] },
            { name: "C3", generations: ["I (2002-2010)", "II (2009-2016)", "III (2016-obecnie)"] },
            { name: "C4", generations: ["I (2004-2010)", "II (2010-2018)", "III (2020-obecnie)"] },
            { name: "C5", generations: ["I (2001-2008)", "II (2008-2017)"] },
            { name: "C6", generations: ["I (2005-2012)"] },
            { name: "Xsara", generations: ["I (1997-2006)"] },
            { name: "Xsara Picasso", generations: ["I (1999-2010)"] },
            { name: "C3 Aircross", generations: ["I (2017-obecnie)"] },
            { name: "C4 Aircross", generations: ["I (2012-2017)"] },
            { name: "C5 Aircross", generations: ["I (2018-obecnie)"] }
        ]
    },

    // WŁOSKIE MARKI
    {
        brand: "Fiat",
        models: [
            { name: "Punto", generations: ["176 (1993-1999)", "188 (1999-2010)", "199 (2005-2018)"] },
            { name: "Panda", generations: ["141 (1980-2003)", "169 (2003-2012)", "312 (2011-obecnie)"] },
            { name: "500", generations: ["312 (2007-2020)", "330 (2020-obecnie)"] },
            { name: "Bravo", generations: ["182 (1995-2001)", "198 (2007-2014)"] },
            { name: "Tipo", generations: ["160 (1988-1995)", "356 (2015-obecnie)"] },
            { name: "Doblo", generations: ["119 (2001-2009)", "263 (2009-obecnie)"] },
            { name: "Ducato", generations: ["230 (1994-2002)", "244 (2002-2006)", "250 (2006-2014)", "290 (2014-obecnie)"] }
        ]
    },
    {
        brand: "Alfa Romeo",
        models: [
            { name: "145", generations: ["930 (1994-2001)"] },
            { name: "146", generations: ["930 (1994-2001)"] },
            { name: "147", generations: ["937 (2000-2010)"] },
            { name: "155", generations: ["167 (1992-1997)"] },
            { name: "156", generations: ["932 (1997-2007)"] },
            { name: "159", generations: ["939 (2005-2011)"] },
            { name: "166", generations: ["936 (1998-2007)"] },
            { name: "Giulia", generations: ["952 (2015-obecnie)"] },
            { name: "Giulietta", generations: ["940 (2010-2020)"] },
            { name: "Stelvio", generations: ["949 (2016-obecnie)"] },
            { name: "Tonale", generations: ["965 (2022-obecnie)"] }
        ]
    },
    {
        brand: "Lancia",
        models: [
            { name: "Delta", generations: ["831 (1979-1994)", "836 (1993-1999)", "844 (2008-2014)"] },
            { name: "Lybra", generations: ["839 (1999-2005)"] },
            { name: "Musa", generations: ["350 (2004-2012)"] },
            { name: "Thesis", generations: ["841 (2001-2009)"] },
            { name: "Ypsilon", generations: ["840 (2003-2011)", "846 (2011-obecnie)"] }
        ]
    },

    // BRYTYJSKIE MARKI
    {
        brand: "Ford",
        models: [
            { name: "Fiesta", generations: ["I (1976-1983)", "II (1983-1989)", "III (1989-1997)", "IV (1995-2002)", "V (2002-2008)", "VI (2008-2017)", "VII (2017-2023)"] },
            { name: "Focus", generations: ["I (1998-2007)", "II (2004-2012)", "III (2010-2018)", "IV (2018-obecnie)"] },
            { name: "Mondeo", generations: ["I (1993-2000)", "II (2000-2007)", "III (2007-2014)", "IV (2014-2022)"] },
            { name: "Escort", generations: ["I (1968-1974)", "II (1974-1980)", "III (1980-1986)", "IV (1986-1990)", "V (1990-2000)"] },
            { name: "Ka", generations: ["I (1996-2008)", "II (2008-2016)", "III (2016-2020)"] },
            { name: "Kuga", generations: ["I (2008-2012)", "II (2012-2019)", "III (2019-obecnie)"] },
            { name: "EcoSport", generations: ["I (2003-2012)", "II (2012-2022)"] },
            { name: "Edge", generations: ["I (2014-2020)"] },
            { name: "Explorer", generations: ["VI (2019-obecnie)"] },
            { name: "Mustang", generations: ["VI (2014-2023)", "VII (2023-obecnie)"] }
        ]
    },
    {
        brand: "Vauxhall",
        models: [
            { name: "Corsa", generations: ["B (1993-2000)", "C (2000-2006)", "D (2006-2014)", "E (2014-2019)", "F (2019-obecnie)"] },
            { name: "Astra", generations: ["F (1991-1998)", "G (1998-2009)", "H (2004-2014)", "J (2009-2015)", "K (2015-2021)", "L (2021-obecnie)"] },
            { name: "Insignia", generations: ["A (2008-2017)", "B (2017-obecnie)"] },
            { name: "Mokka", generations: ["J-A (2012-2019)", "B (2020-obecnie)"] },
            { name: "Crossland", generations: ["X (2017-2021)", "I (2021-obecnie)"] },
            { name: "Grandland", generations: ["X (2017-2021)", "I (2021-obecnie)"] }
        ]
    },

    // CZESKIE MARKI
    {
        brand: "Skoda",
        models: [
            { name: "Felicia", generations: ["I (1994-2001)"] },
            { name: "Fabia", generations: ["I (1999-2007)", "II (2007-2014)", "III (2014-2021)", "IV (2021-obecnie)"] },
            { name: "Octavia", generations: ["I (1996-2010)", "II (2004-2013)", "III (2012-2020)", "IV (2019-obecnie)"] },
            { name: "Superb", generations: ["I (2001-2008)", "II (2008-2015)", "III (2015-obecnie)"] },
            { name: "Rapid", generations: ["I (2012-2019)"] },
            { name: "Scala", generations: ["I (2018-obecnie)"] },
            { name: "Kamiq", generations: ["I (2019-obecnie)"] },
            { name: "Karoq", generations: ["I (2017-obecnie)"] },
            { name: "Kodiaq", generations: ["I (2016-obecnie)"] },
            { name: "Enyaq", generations: ["I (2020-obecnie)"] }
        ]
    },

    // JAPOŃSKIE MARKI
    {
        brand: "Toyota",
        models: [
            { name: "Yaris", generations: ["P1 (1999-2005)", "P2 (2005-2011)", "P13 (2011-2020)", "P21 (2020-obecnie)"] },
            { name: "Corolla", generations: ["E110 (1995-2002)", "E120 (2001-2007)", "E140/E150 (2006-2013)", "E160/E170 (2013-2019)", "E210 (2019-obecnie)"] },
            { name: "Camry", generations: ["XV40 (2006-2011)", "XV50 (2011-2017)", "XV70 (2017-obecnie)"] },
            { name: "Avensis", generations: ["T220 (1997-2003)", "T250 (2003-2009)", "T270 (2009-2018)"] },
            { name: "Prius", generations: ["XW10 (1997-2003)", "XW20 (2003-2009)", "XW30 (2009-2015)", "XW50 (2015-2022)", "XW60 (2022-obecnie)"] },
            { name: "RAV4", generations: ["XA10 (1994-2000)", "XA20 (2000-2005)", "XA30 (2005-2012)", "XA40 (2012-2018)", "XA50 (2018-obecnie)"] },
            { name: "Highlander", generations: ["XU20 (2000-2007)", "XU40 (2007-2013)", "XU50 (2013-2019)", "XU70 (2019-obecnie)"] },
            { name: "Land Cruiser", generations: ["J100 (1998-2007)", "J200 (2007-2021)", "J300 (2021-obecnie)"] },
            { name: "C-HR", generations: ["XP10 (2016-obecnie)"] },
            { name: "Aygo", generations: ["AB10 (2005-2014)", "AB40 (2014-2022)", "B4 (2022-obecnie)"] }
        ]
    },
    {
        brand: "Honda",
        models: [
            { name: "Civic", generations: ["EG/EH/EJ (1991-1995)", "EK (1995-2000)", "EM/EP/ES/EU (2000-2005)", "FD/FN/FK (2005-2011)", "FB/FG/FK (2011-2017)", "FC/FK (2017-2021)", "FL (2021-obecnie)"] },
            { name: "Accord", generations: ["CD (1993-1997)", "CG/CH/CL (1997-2002)", "CL/CM (2002-2008)", "CU (2008-2015)", "CR (2012-2017)", "CV (2017-obecnie)"] },
            { name: "CR-V", generations: ["RD (1995-2001)", "RD (2001-2006)", "RE (2006-2012)", "RM (2012-2017)", "RW (2017-obecnie)"] },
            { name: "HR-V", generations: ["GH (1998-2006)", "RU (2014-2021)", "RS (2021-obecnie)"] },
            { name: "Jazz", generations: ["AA (2001-2008)", "GE/GP (2008-2015)", "GK (2015-2020)", "GR (2020-obecnie)"] },
            { name: "Pilot", generations: ["YF1 (2002-2008)", "YF2 (2008-2015)", "YF3 (2015-2022)", "YF4 (2022-obecnie)"] }
        ]
    },
    {
        brand: "Nissan",
        models: [
            { name: "Micra", generations: ["K10 (1982-1992)", "K11 (1992-2002)", "K12 (2002-2010)", "K13 (2010-2017)", "K14 (2017-obecnie)"] },
            { name: "Almera", generations: ["N15 (1995-2000)", "N16 (2000-2006)", "N17 (2012-2018)"] },
            { name: "Primera", generations: ["P10 (1990-1996)", "P11 (1996-2002)", "P12 (2002-2008)"] },
            { name: "Maxima", generations: ["A32 (1994-2000)", "A33 (2000-2003)", "A34 (2003-2008)", "A35 (2008-2014)", "A36 (2015-obecnie)"] },
            { name: "Qashqai", generations: ["J10 (2006-2013)", "J11 (2013-2021)", "J12 (2021-obecnie)"] },
            { name: "X-Trail", generations: ["T30 (2001-2007)", "T31 (2007-2014)", "T32 (2014-2022)", "T33 (2022-obecnie)"] },
            { name: "Juke", generations: ["F15 (2010-2019)", "F16 (2019-obecnie)"] },
            { name: "Leaf", generations: ["ZE0 (2010-2017)", "ZE1 (2017-obecnie)"] }
        ]
    },
    {
        brand: "Mazda",
        models: [
            { name: "2", generations: ["DY (2002-2007)", "DE (2007-2014)", "DJ (2014-obecnie)"] },
            { name: "3", generations: ["BK (2003-2009)", "BL (2009-2013)", "BM/BN (2013-2019)", "BP (2019-obecnie)"] },
            { name: "6", generations: ["GG/GY (2002-2008)", "GH (2007-2012)", "GJ/GL (2012-2018)", "GM (2018-2021)"] },
            { name: "CX-3", generations: ["DK (2015-2021)"] },
            { name: "CX-5", generations: ["KE (2012-2017)", "KF (2017-2022)", "KF (2022-obecnie)"] },
            { name: "CX-7", generations: ["ER (2006-2012)"] },
            { name: "CX-9", generations: ["TB (2006-2015)", "TC (2016-obecnie)"] },
            { name: "MX-5", generations: ["NA (1989-1997)", "NB (1998-2005)", "NC (2005-2015)", "ND (2015-obecnie)"] }
        ]
    },
    {
        brand: "Subaru",
        models: [
            { name: "Impreza", generations: ["GC/GF (1992-2000)", "GD/GG (2000-2007)", "GE/GH/GR/GV (2007-2011)", "GP/GJ (2011-2016)", "GT (2016-obecnie)"] },
            { name: "Legacy", generations: ["BC/BF (1989-1994)", "BD/BG (1994-1999)", "BE/BH (1999-2003)", "BL/BP (2003-2009)", "BM/BR (2009-2014)", "BN/BS (2014-2019)", "BT (2019-obecnie)"] },
            { name: "Outback", generations: ["BG (1994-1999)", "BH (1999-2003)", "BP (2003-2009)", "BR (2009-2014)", "BS (2014-2019)", "BT (2019-obecnie)"] },
            { name: "Forester", generations: ["SF (1997-2002)", "SG (2002-2008)", "SH (2008-2012)", "SJ (2012-2018)", "SK (2018-obecnie)"] },
            { name: "XV/Crosstrek", generations: ["GP (2012-2017)", "GT (2017-obecnie)"] }
        ]
    },
    {
        brand: "Mitsubishi",
        models: [
            { name: "Lancer", generations: ["CJ/CK (1995-2003)", "CS/CT (2003-2007)", "CY/CZ (2007-2017)"] },
            { name: "Outlander", generations: ["CU (2001-2006)", "CW (2006-2012)", "GF/GG (2012-2021)", "GN (2021-obecnie)"] },
            { name: "ASX", generations: ["GA (2010-2020)", "XD (2023-obecnie)"] },
            { name: "Eclipse Cross", generations: ["GK (2017-obecnie)"] },
            { name: "Pajero", generations: ["V60 (1999-2006)", "V80/V90 (2006-2021)"] }
        ]
    },

    // KOREAŃSKIE MARKI
    {
        brand: "Hyundai",
        models: [
            { name: "i10", generations: ["PA (2007-2013)", "BA (2013-2019)", "BC (2019-obecnie)"] },
            { name: "i20", generations: ["PB (2008-2014)", "GB (2014-2020)", "BC (2020-obecnie)"] },
            { name: "i30", generations: ["FD (2007-2012)", "GD (2012-2017)", "PD (2017-obecnie)"] },
            { name: "Elantra", generations: ["XD (2000-2006)", "HD (2006-2011)", "MD (2010-2016)", "AD (2016-2020)", "CN7 (2020-obecnie)"] },
            { name: "Sonata", generations: ["EF (1998-2005)", "NF (2004-2009)", "YF (2009-2014)", "LF (2014-2019)", "DN8 (2019-obecnie)"] },
            { name: "Tucson", generations: ["JM (2004-2010)", "IX (2009-2015)", "TL (2015-2020)", "NX4 (2020-obecnie)"] },
            { name: "Santa Fe", generations: ["SM (2000-2006)", "CM (2006-2012)", "DM (2012-2018)", "TM (2018-obecnie)"] },
            { name: "Kona", generations: ["OS (2017-obecnie)"] },
            { name: "Ioniq", generations: ["AE (2016-2022)"] },
            { name: "Ioniq 5", generations: ["NE (2021-obecnie)"] }
        ]
    },
    {
        brand: "Kia",
        models: [
            { name: "Picanto", generations: ["BA (2004-2011)", "TA (2011-2017)", "JA (2017-obecnie)"] },
            { name: "Rio", generations: ["DC (2000-2005)", "JB (2005-2011)", "UB (2011-2017)", "YB (2017-obecnie)"] },
            { name: "Ceed", generations: ["ED (2006-2012)", "JD (2012-2018)", "CD (2018-obecnie)"] },
            { name: "Cerato", generations: ["LD (2004-2009)", "TD (2009-2013)", "YD (2013-2018)", "BD (2018-obecnie)"] },
            { name: "Optima", generations: ["MS (2000-2005)", "MG (2005-2010)", "TF (2010-2015)", "JF (2015-2020)", "DL3 (2020-obecnie)"] },
            { name: "Sportage", generations: ["JA (1993-2004)", "JE/KM (2004-2010)", "SL (2010-2015)", "QL (2015-2021)", "NQ5 (2021-obecnie)"] },
            { name: "Sorento", generations: ["BL (2002-2009)", "XM (2009-2015)", "UM (2015-2020)", "MQ4 (2020-obecnie)"] },
            { name: "Stonic", generations: ["YB (2017-obecnie)"] },
            { name: "Niro", generations: ["DE (2016-2022)", "SG2 (2022-obecnie)"] },
            { name: "EV6", generations: ["CV (2021-obecnie)"] }
        ]
    },

    // CHIŃSKIE MARKI
    {
        brand: "BYD",
        models: [
            { name: "Atto 3", generations: ["I (2022-obecnie)"] },
            { name: "Han", generations: ["I (2020-obecnie)"] },
            { name: "Tang", generations: ["I (2015-2018)", "II (2018-obecnie)"] },
            { name: "Seal", generations: ["I (2022-obecnie)"] },
            { name: "Dolphin", generations: ["I (2021-obecnie)"] }
        ]
    },
    {
        brand: "Geely",
        models: [
            { name: "Coolray", generations: ["I (2018-obecnie)"] },
            { name: "Emgrand", generations: ["EC7 (2009-2016)", "GL (2016-obecnie)"] },
            { name: "Atlas", generations: ["I (2016-obecnie)"] },
            { name: "Geometry A", generations: ["I (2019-obecnie)"] }
        ]
    },
    {
        brand: "MG",
        models: [
            { name: "ZS", generations: ["I (2017-obecnie)"] },
            { name: "HS", generations: ["I (2018-obecnie)"] },
            { name: "5", generations: ["I (2021-obecnie)"] },
            { name: "4", generations: ["I (2023-obecnie)"] },
            { name: "Marvel R", generations: ["I (2021-obecnie)"] }
        ]
    },
    {
        brand: "Great Wall",
        models: [
            { name: "Haval H6", generations: ["I (2011-2017)", "II (2017-obecnie)"] },
            { name: "Haval H2", generations: ["I (2014-2021)"] },
            { name: "Haval Jolion", generations: ["I (2020-obecnie)"] },
            { name: "Wingle", generations: ["5 (2011-2020)", "7 (2020-obecnie)"] }
        ]
    },

    // AMERYKAŃSKIE MARKI
    {
        brand: "Chevrolet",
        models: [
            { name: "Aveo", generations: ["T200 (2002-2011)", "T300 (2011-2020)"] },
            { name: "Cruze", generations: ["J300 (2008-2016)", "J400 (2016-2023)"] },
            { name: "Malibu", generations: ["Z03 (1997-2003)", "G6 (2004-2007)", "Epsilon (2008-2012)", "E2XX (2012-2023)"] },
            { name: "Camaro", generations: ["IV (1993-2002)", "V (2009-2015)", "VI (2015-2023)", "VII (2024-obecnie)"] },
            { name: "Corvette", generations: ["C5 (1997-2004)", "C6 (2005-2013)", "C7 (2014-2019)", "C8 (2020-obecnie)"] },
            { name: "Equinox", generations: ["I (2004-2009)", "II (2009-2017)", "III (2017-obecnie)"] },
            { name: "Tahoe", generations: ["GMT400 (1995-2000)", "GMT800 (2000-2006)", "GMT900 (2007-2014)", "K2XX (2015-2020)", "T1XX (2021-obecnie)"] }
        ]
    },
    {
        brand: "Cadillac",
        models: [
            { name: "CTS", generations: ["I (2002-2007)", "II (2008-2014)", "III (2014-2019)"] },
            { name: "Escalade", generations: ["GMT800 (1999-2006)", "GMT900 (2007-2014)", "K2XX (2015-2020)", "T1XX (2021-obecnie)"] },
            { name: "XT4", generations: ["I (2018-obecnie)"] },
            { name: "XT5", generations: ["I (2016-obecnie)"] },
            { name: "XT6", generations: ["I (2019-obecnie)"] }
        ]
    },

    // INNE MARKI
    {
        brand: "Volvo",
        models: [
            { name: "S40", generations: ["VS (1995-2004)", "MS (2004-2012)"] },
            { name: "S60", generations: ["P2 (2000-2009)", "P3 (2010-2018)", "P4 (2018-obecnie)"] },
            { name: "S90", generations: ["P1 (1996-1998)", "P5 (2016-obecnie)"] },
            { name: "V40", generations: ["VW (1995-2004)", "M (2012-2019)"] },
            { name: "V60", generations: ["P3 (2010-2018)", "P4 (2018-obecnie)"] },
            { name: "V90", generations: ["P1 (1996-1998)", "P5 (2016-obecnie)"] },
            { name: "XC40", generations: ["P5 (2017-obecnie)"] },
            { name: "XC60", generations: ["P3 (2008-2017)", "P4 (2017-obecnie)"] },
            { name: "XC90", generations: ["P2 (2002-2014)", "P5 (2014-obecnie)"] }
        ]
    },
    {
        brand: "Saab",
        models: [
            { name: "9-3", generations: ["YS3D (1998-2002)", "YS3F (2002-2012)"] },
            { name: "9-5", generations: ["YS3E (1997-2010)", "YS3G (2010-2012)"] }
        ]
    },
    {
        brand: "Dacia",
        models: [
            { name: "Logan", generations: ["I (2004-2012)", "II (2012-obecnie)"] },
            { name: "Sandero", generations: ["I (2007-2012)", "II (2012-2020)", "III (2020-obecnie)"] },
            { name: "Duster", generations: ["I (2010-2017)", "II (2017-obecnie)"] },
            { name: "Spring", generations: ["I (2021-obecnie)"] }
        ]
    },
    {
        brand: "Seat",
        models: [
            { name: "Ibiza", generations: ["6K (1993-2002)", "6L (2002-2008)", "6J (2008-2017)", "KJ (2017-obecnie)"] },
            { name: "Leon", generations: ["1M (1999-2005)", "1P (2005-2012)", "5F (2012-2020)", "KL (2020-obecnie)"] },
            { name: "Altea", generations: ["5P (2004-2015)"] },
            { name: "Ateca", generations: ["KH (2016-obecnie)"] },
            { name: "Tarraco", generations: ["KN (2018-2023)"] }
        ]
    },

    // DODATKOWE MARKI EUROPEJSKIE
    {
        brand: "Opel",
        models: [
            { name: "Corsa", generations: ["A (1982-1993)", "B (1993-2000)", "C (2000-2006)", "D (2006-2014)", "E (2014-2019)", "F (2019-obecnie)"] },
            { name: "Astra", generations: ["F (1991-1998)", "G (1998-2009)", "H (2004-2014)", "J (2009-2015)", "K (2015-2021)", "L (2021-obecnie)"] },
            { name: "Vectra", generations: ["A (1988-1995)", "B (1995-2002)", "C (2002-2008)"] },
            { name: "Insignia", generations: ["A (2008-2017)", "B (2017-obecnie)"] },
            { name: "Zafira", generations: ["A (1999-2005)", "B (2005-2014)", "C (2011-2019)"] },
            { name: "Mokka", generations: ["J-A (2012-2019)", "B (2020-obecnie)"] },
            { name: "Crossland", generations: ["X (2017-2021)", "I (2021-obecnie)"] },
            { name: "Grandland", generations: ["X (2017-2021)", "I (2021-obecnie)"] },
            { name: "Combo", generations: ["A (1993-2001)", "B (2001-2011)", "C (2011-2018)", "E (2018-obecnie)"] },
            { name: "Vivaro", generations: ["A (2001-2014)", "B (2014-2019)", "C (2019-obecnie)"] }
        ]
    },
    {
        brand: "Mini",
        models: [
            { name: "Cooper", generations: ["R50/R53 (2001-2006)", "R56 (2006-2013)", "F56 (2014-obecnie)"] },
            { name: "Clubman", generations: ["R55 (2007-2014)", "F54 (2015-obecnie)"] },
            { name: "Countryman", generations: ["R60 (2010-2016)", "F60 (2017-obecnie)"] },
            { name: "Paceman", generations: ["R61 (2013-2016)"] },
            { name: "Cabrio", generations: ["R52 (2004-2008)", "R57 (2009-2015)", "F57 (2016-obecnie)"] }
        ]
    },
    {
        brand: "Land Rover",
        models: [
            { name: "Defender", generations: ["Series (1948-1985)", "90/110/130 (1983-2016)", "L663 (2019-obecnie)"] },
            { name: "Discovery", generations: ["Series I (1989-1998)", "Series II (1998-2004)", "3 (2004-2009)", "4 (2009-2016)", "5 (2017-obecnie)"] },
            { name: "Range Rover", generations: ["Classic (1970-1996)", "P38A (1994-2002)", "L322 (2002-2012)", "L405 (2012-2022)", "L460 (2022-obecnie)"] },
            { name: "Range Rover Sport", generations: ["L320 (2005-2013)", "L494 (2013-2022)", "L461 (2022-obecnie)"] },
            { name: "Range Rover Evoque", generations: ["L538 (2011-2018)", "L551 (2019-obecnie)"] },
            { name: "Freelander", generations: ["L314 (1997-2006)", "L359 (2006-2014)"] },
            { name: "Discovery Sport", generations: ["L550 (2014-obecnie)"] }
        ]
    },
    {
        brand: "Jaguar",
        models: [
            { name: "XE", generations: ["X760 (2015-obecnie)"] },
            { name: "XF", generations: ["X250 (2007-2015)", "X260 (2015-obecnie)"] },
            { name: "XJ", generations: ["X350/X358 (2003-2009)", "X351 (2009-2019)"] },
            { name: "F-Pace", generations: ["X761 (2015-obecnie)"] },
            { name: "E-Pace", generations: ["X540 (2017-obecnie)"] },
            { name: "I-Pace", generations: ["X590 (2018-obecnie)"] },
            { name: "F-Type", generations: ["X152 (2013-2024)"] }
        ]
    },

    // DODATKOWE MARKI JAPOŃSKIE
    {
        brand: "Lexus",
        models: [
            { name: "IS", generations: ["XE10 (1998-2005)", "XE20 (2005-2013)", "XE30 (2013-2020)", "XE40 (2020-obecnie)"] },
            { name: "ES", generations: ["XV10 (1991-1996)", "XV20 (1996-2001)", "XV30 (2001-2006)", "XV40 (2006-2012)", "XV60 (2012-2018)", "XV70 (2018-obecnie)"] },
            { name: "GS", generations: ["S140 (1991-1997)", "S160 (1997-2005)", "S190 (2005-2012)", "L10 (2012-2020)"] },
            { name: "LS", generations: ["XF10 (1989-1994)", "XF20 (1994-2000)", "XF30 (2000-2006)", "XF40 (2006-2017)", "XF50 (2017-obecnie)"] },
            { name: "RX", generations: ["XU10 (1998-2003)", "XU30 (2003-2009)", "AL10 (2009-2015)", "AL20 (2015-2022)", "AL30 (2022-obecnie)"] },
            { name: "NX", generations: ["AZ10 (2014-2021)", "AZ20 (2021-obecnie)"] },
            { name: "UX", generations: ["MZAA10 (2018-obecnie)"] }
        ]
    },
    {
        brand: "Infiniti",
        models: [
            { name: "Q50", generations: ["V37 (2013-obecnie)"] },
            { name: "Q60", generations: ["CV37 (2016-2022)"] },
            { name: "Q70", generations: ["Y51 (2010-2019)"] },
            { name: "QX50", generations: ["J50 (2013-2017)", "J55 (2018-obecnie)"] },
            { name: "QX60", generations: ["L50 (2012-2022)", "L51 (2021-obecnie)"] },
            { name: "QX70", generations: ["S51 (2008-2017)"] }
        ]
    },
    {
        brand: "Acura",
        models: [
            { name: "TLX", generations: ["I (2014-2020)", "II (2020-obecnie)"] },
            { name: "ILX", generations: ["I (2012-2022)"] },
            { name: "MDX", generations: ["YD1 (2000-2006)", "YD2 (2006-2013)", "YD3 (2013-2022)", "YD4 (2021-obecnie)"] },
            { name: "RDX", generations: ["TB1 (2006-2012)", "TB2 (2012-2018)", "TB3 (2018-obecnie)"] },
            { name: "NSX", generations: ["NA1/NA2 (1990-2005)", "NC1 (2016-2022)"] }
        ]
    },

    // DODATKOWE MARKI AMERYKAŃSKIE
    {
        brand: "Ford (USA)",
        models: [
            { name: "F-150", generations: ["P415 (1997-2003)", "P2 (2004-2008)", "P415 (2009-2014)", "P552 (2015-2020)", "P702 (2021-obecnie)"] },
            { name: "Mustang", generations: ["SN95 (1994-2004)", "S197 (2005-2014)", "S550 (2015-2023)", "S650 (2024-obecnie)"] },
            { name: "Explorer", generations: ["UN46 (1990-1994)", "UN105 (1995-2001)", "U152 (2002-2005)", "U251 (2006-2010)", "U502 (2011-2019)", "U625 (2020-obecnie)"] },
            { name: "Escape", generations: ["CD2 (2000-2007)", "ZD (2008-2012)", "C520 (2013-2019)", "C2 (2020-obecnie)"] },
            { name: "Expedition", generations: ["UN93 (1996-2002)", "U222 (2003-2006)", "U324 (2007-2017)", "U553 (2018-obecnie)"] }
        ]
    },
    {
        brand: "GMC",
        models: [
            { name: "Sierra", generations: ["GMT400 (1988-1998)", "GMT800 (1999-2006)", "GMT900 (2007-2013)", "K2XX (2014-2018)", "T1XX (2019-obecnie)"] },
            { name: "Yukon", generations: ["GMT400 (1992-1999)", "GMT800 (2000-2006)", "GMT900 (2007-2014)", "K2XX (2015-2020)", "T1XX (2021-obecnie)"] },
            { name: "Acadia", generations: ["GMT Lambda (2007-2016)", "C1XX (2017-obecnie)"] },
            { name: "Terrain", generations: ["GMT Theta (2010-2017)", "C1XX (2018-obecnie)"] }
        ]
    },
    {
        brand: "Jeep",
        models: [
            { name: "Wrangler", generations: ["YJ (1986-1995)", "TJ (1996-2006)", "JK (2007-2018)", "JL (2018-obecnie)"] },
            { name: "Grand Cherokee", generations: ["ZJ (1992-1998)", "WJ (1999-2004)", "WK (2005-2010)", "WK2 (2011-2021)", "WL (2021-obecnie)"] },
            { name: "Cherokee", generations: ["XJ (1984-2001)", "KJ (2002-2007)", "KK (2008-2012)", "KL (2014-2023)"] },
            { name: "Compass", generations: ["MK (2006-2017)", "MP (2017-obecnie)"] },
            { name: "Renegade", generations: ["BU (2014-obecnie)"] },
            { name: "Gladiator", generations: ["JT (2019-obecnie)"] }
        ]
    },
    {
        brand: "Dodge",
        models: [
            { name: "Charger", generations: ["LX (2005-2023)", "LA (2024-obecnie)"] },
            { name: "Challenger", generations: ["LC (2008-2023)"] },
            { name: "Durango", generations: ["HB (1998-2003)", "HG (2004-2009)", "WD (2011-2023)", "WL (2024-obecnie)"] },
            { name: "Journey", generations: ["JC (2008-2020)"] },
            { name: "Ram 1500", generations: ["DS/DJ/D1 (2009-2018)", "DT (2019-obecnie)"] }
        ]
    },

    // DODATKOWE MARKI CHIŃSKIE
    {
        brand: "Chery",
        models: [
            { name: "Tiggo 7", generations: ["I (2016-2021)", "II (2021-obecnie)"] },
            { name: "Tiggo 8", generations: ["I (2018-obecnie)"] },
            { name: "Arrizo 6", generations: ["I (2018-obecnie)"] },
            { name: "QQ", generations: ["S11 (2003-2013)", "S15 (2014-2019)"] },
            { name: "Omoda 5", generations: ["I (2022-obecnie)"] }
        ]
    },
    {
        brand: "JAC",
        models: [
            { name: "S3", generations: ["I (2014-2019)", "II (2019-obecnie)"] },
            { name: "S4", generations: ["I (2017-obecnie)"] },
            { name: "iEV7S", generations: ["I (2017-2020)"] },
            { name: "e-S2", generations: ["I (2019-obecnie)"] }
        ]
    },
    {
        brand: "Lynk & Co",
        models: [
            { name: "01", generations: ["I (2017-obecnie)"] },
            { name: "02", generations: ["I (2018-obecnie)"] },
            { name: "03", generations: ["I (2018-obecnie)"] },
            { name: "05", generations: ["I (2020-obecnie)"] }
        ]
    },
    {
        brand: "NIO",
        models: [
            { name: "ES6", generations: ["I (2019-obecnie)"] },
            { name: "ES8", generations: ["I (2018-obecnie)"] },
            { name: "EC6", generations: ["I (2020-obecnie)"] },
            { name: "ET7", generations: ["I (2022-obecnie)"] },
            { name: "ET5", generations: ["I (2022-obecnie)"] }
        ]
    },
    {
        brand: "Xpeng",
        models: [
            { name: "P7", generations: ["I (2020-obecnie)"] },
            { name: "G3", generations: ["I (2018-2020)", "II (2020-obecnie)"] },
            { name: "P5", generations: ["I (2021-obecnie)"] },
            { name: "G9", generations: ["I (2022-obecnie)"] }
        ]
    },

    // DODATKOWE MARKI INDYJSKIE
    {
        brand: "Tata",
        models: [
            { name: "Nexon", generations: ["I (2017-obecnie)"] },
            { name: "Harrier", generations: ["I (2019-obecnie)"] },
            { name: "Safari", generations: ["I (1998-2019)", "II (2021-obecnie)"] },
            { name: "Altroz", generations: ["I (2020-obecnie)"] },
            { name: "Punch", generations: ["I (2021-obecnie)"] }
        ]
    },
    {
        brand: "Mahindra",
        models: [
            { name: "XUV500", generations: ["W201 (2011-2021)"] },
            { name: "XUV700", generations: ["Y400 (2021-obecnie)"] },
            { name: "Scorpio", generations: ["I (2002-2014)", "II (2014-2022)", "N (2022-obecnie)"] },
            { name: "Thar", generations: ["I (2010-2019)", "II (2020-obecnie)"] },
            { name: "Bolero", generations: ["I (2001-obecnie)"] }
        ]
    },

    // DODATKOWE MARKI ROSYJSKIE
    {
        brand: "Lada",
        models: [
            { name: "Granta", generations: ["I (2011-obecnie)"] },
            { name: "Vesta", generations: ["I (2015-obecnie)"] },
            { name: "XRAY", generations: ["I (2015-obecnie)"] },
            { name: "Niva", generations: ["2121 (1977-obecnie)", "Travel (2020-obecnie)"] },
            { name: "Largus", generations: ["I (2012-obecnie)"] }
        ]
    },
    {
        brand: "UAZ",
        models: [
            { name: "Hunter", generations: ["I (2003-obecnie)"] },
            { name: "Patriot", generations: ["I (2005-obecnie)"] },
            { name: "Pickup", generations: ["I (2008-obecnie)"] },
            { name: "Profi", generations: ["I (2017-obecnie)"] }
        ]
    },

    // DODATKOWE MARKI LUKSUSOWE
    {
        brand: "Bentley",
        models: [
            { name: "Continental", generations: ["I (2003-2018)", "II (2018-obecnie)"] },
            { name: "Flying Spur", generations: ["I (2005-2013)", "II (2013-2019)", "III (2019-obecnie)"] },
            { name: "Bentayga", generations: ["I (2015-obecnie)"] },
            { name: "Mulsanne", generations: ["I (2010-2020)"] }
        ]
    },
    {
        brand: "Rolls-Royce",
        models: [
            { name: "Ghost", generations: ["I (2009-2020)", "II (2020-obecnie)"] },
            { name: "Phantom", generations: ["VII (2003-2017)", "VIII (2017-obecnie)"] },
            { name: "Wraith", generations: ["II (2013-2023)"] },
            { name: "Dawn", generations: ["I (2015-2023)"] },
            { name: "Cullinan", generations: ["I (2018-obecnie)"] }
        ]
    },
    {
        brand: "Maserati",
        models: [
            { name: "Ghibli", generations: ["M157 (2013-2023)", "M158 (2024-obecnie)"] },
            { name: "Quattroporte", generations: ["V (2004-2012)", "VI (2013-2022)", "VII (2023-obecnie)"] },
            { name: "Levante", generations: ["M161 (2016-obecnie)"] },
            { name: "GranTurismo", generations: ["M145 (2007-2019)", "M158 (2023-obecnie)"] },
            { name: "MC20", generations: ["M240 (2020-obecnie)"] }
        ]
    },
    {
        brand: "Ferrari",
        models: [
            { name: "488", generations: ["F142 (2015-2019)"] },
            { name: "F8", generations: ["F142M (2019-2023)"] },
            { name: "296", generations: ["F171 (2021-obecnie)"] },
            { name: "SF90", generations: ["F173 (2019-obecnie)"] },
            { name: "Roma", generations: ["F169 (2020-obecnie)"] },
            { name: "Portofino", generations: ["F164 (2017-2023)"] }
        ]
    },
    {
        brand: "Lamborghini",
        models: [
            { name: "Huracan", generations: ["LP 610-4 (2014-2023)", "Tecnica (2023-obecnie)"] },
            { name: "Aventador", generations: ["LP 700-4 (2011-2022)"] },
            { name: "Urus", generations: ["I (2018-obecnie)"] },
            { name: "Revuelto", generations: ["LB744 (2023-obecnie)"] }
        ]
    },
    {
        brand: "McLaren",
        models: [
            { name: "570S", generations: ["I (2015-2021)"] },
            { name: "720S", generations: ["I (2017-2022)"] },
            { name: "750S", generations: ["I (2023-obecnie)"] },
            { name: "Artura", generations: ["I (2021-obecnie)"] },
            { name: "GT", generations: ["I (2019-2023)"] }
        ]
    },

    // DODATKOWE MARKI ELEKTRYCZNE
    {
        brand: "Tesla",
        models: [
            { name: "Model S", generations: ["I (2012-2021)", "II (2021-obecnie)"] },
            { name: "Model 3", generations: ["I (2017-2023)", "II (2023-obecnie)"] },
            { name: "Model X", generations: ["I (2015-2021)", "II (2021-obecnie)"] },
            { name: "Model Y", generations: ["I (2020-obecnie)"] },
            { name: "Cybertruck", generations: ["I (2023-obecnie)"] }
        ]
    },
    {
        brand: "Rivian",
        models: [
            { name: "R1T", generations: ["I (2021-obecnie)"] },
            { name: "R1S", generations: ["I (2021-obecnie)"] },
            { name: "EDV", generations: ["I (2022-obecnie)"] }
        ]
    },
    {
        brand: "Lucid",
        models: [
            { name: "Air", generations: ["I (2021-obecnie)"] },
            { name: "Gravity", generations: ["I (2024-obecnie)"] }
        ]
    },
    {
        brand: "Polestar",
        models: [
            { name: "1", generations: ["I (2019-2021)"] },
            { name: "2", generations: ["I (2019-obecnie)"] },
            { name: "3", generations: ["I (2023-obecnie)"] },
            { name: "4", generations: ["I (2024-obecnie)"] }
        ]
    }
];

// Schema dla MongoDB
const CarBrandSchema = new mongoose.Schema({
    brand: { type: String, required: true, unique: true },
    models: [{
        name: { type: String, required: true },
        generations: [{ type: String, required: true }]
    }]
});

const CarBrand = mongoose.model('CarBrand', CarBrandSchema, 'carbrands');

async function replaceCompleteDatabase() {
    try {
        console.log('🔄 Łączenie z bazą danych...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Połączono z MongoDB Atlas');

        console.log('🗑️ Usuwanie starej kolekcji...');
        await CarBrand.deleteMany({});
        console.log('✅ Stara kolekcja została usunięta');

        console.log('📝 Dodawanie nowej kompletnej bazy danych...');
        await CarBrand.insertMany(completeCarDatabase);
        console.log(`✅ Dodano ${completeCarDatabase.length} marek samochodów`);

        console.log('\n📊 PODSUMOWANIE:');
        console.log('=' .repeat(50));
        
        let totalModels = 0;
        let totalGenerations = 0;
        
        completeCarDatabase.forEach(brand => {
            totalModels += brand.models.length;
            brand.models.forEach(model => {
                totalGenerations += model.generations.length;
            });
            console.log(`${brand.brand}: ${brand.models.length} modeli`);
        });
        
        console.log('=' .repeat(50));
        console.log(`📈 ŁĄCZNIE: ${completeCarDatabase.length} marek, ${totalModels} modeli, ${totalGenerations} generacji`);
        console.log('=' .repeat(50));

        console.log('🔌 Rozłączanie z bazą danych...');
        await mongoose.disconnect();
        console.log('✅ Rozłączono z bazą danych');

    } catch (error) {
        console.error('❌ Błąd:', error);
        process.exit(1);
    }
}

// Uruchom skrypt
replaceCompleteDatabase();
