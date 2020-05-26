(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.valfor = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DEFAULT = 0x0000,
  NUMERICAL_FORMAT = 0x0001,
  INTERNATIONAL_FORMAT = 0x0002,
  NATIONAL_FORMAT = 0x0004,
  NBR_DIGITS_10 = 0x0008,
  NBR_DIGITS_12 = 0x0010,
  ADD_SEPARATOR = 0x0020,
  SPACE_SEPARATOR = 0x0040,
  DASH_SEPARATOR = 0x0080,
  LOWERCASE = 0x0100,
  UPPERCASE = 0x0200,
  TYPE_PERSONAL_NUMBER = 0x0400,
  TYPE_COORDINATION_NUMBER = 0x0800;

/**
 * Kontrollerar om ett svenskt mobiltelefonnummer är giltigt i enlighet med
 * Post- & Telestyrelsens nummerplan för mobiltelefonitjänster.
 *
 * För att retunera mobiltelefonnumret i ett visst format, kan en andra
 * valfri parameter anges. De format som stöds är:
 *
 *     NUMERICAL_FORMAT = Numeriskt format (standard), NNNNNNNNNN
 *     INTERNATIONAL_FORMAT = Internationellt format E.164, +46NNNNNNNNN
 *     NATIONAL_FORMAT = Nationellt format, NNN-NNN NN NN
 *
 * @param {String} number Mobiltelefonnummer
 * @param {Int} format Önskat format (1-3)
 * @returns {String|Boolean} Mobiltelefonnummer eller 'false'
 */
function cellphonenum(number, format) {
  if (typeof number !== 'string') {
    return false;
  }
  var n = number.replace(/\D/g, ''),
    prefix = [70, 72, 73, 76, 79];
  for (var p in prefix) {
    if (n.indexOf(prefix[p]) > -1 && n.substring(n.indexOf(prefix[p]), n.length)
      .length === 9) {
      if (format & NATIONAL_FORMAT) {
        var fn = '0',
          pdx = n.indexOf(prefix[p]);
        for (var i = pdx; i <= pdx + 8; i++) {
          fn += (i === pdx + 2 ? '-' : (i === pdx + 5 || i === pdx + 7 ? ' ' : '')) + n.substr(i, 1);
        }
        return fn;
      }
      return (format & INTERNATIONAL_FORMAT ? '+46' : '0') + n.substring(n.indexOf(prefix[p]), n.length);
    }
  }
  return false;
}

/**
 * Kontrollerar om ett svenskt person- eller samordningsnummer är giltigt
 * i enlighet med Folkbokföringslagen 1991:481 (18§), SKV 704 och SKV 707.
 *
 * För att retunera person- eller samordningsnumret i ett visst format,
 * kan en andra valfri parameter anges. De format som stöds är:
 *
 *     ADD_SEPARATOR - Lägg till skiljetecken (-)
 *     NBR_DIGITS_12 = 12 siffror (standard), ÅÅÅÅMMDDNNNN
 *     NBR_DIGITS_10 = 10 siffror, ÅÅMMDDNNNN
 *
 * Typ kan vara följande:
 *     TYPE_PERSONAL_NUMBER - vanligt personnummer
 *     TYPE_COORDINATION_NUMBER - samordningnummer
 *
 * @param {String} number Person- eller samordningnummer
 * @param {Int} format Önskat format, (ADD_SEPARATOR | (NBR_DIGITS_12,NBR_DIGITS_10))
 * @param {Int} [type=TYPE_PERSONAL_NUMBER|TYPE_COORDINATION_NUMBER]
 * @returns {String|Boolean} Person-/samordningnummer eller 'false'
 */
function personalidnum(number, format, type) {
  if (typeof number !== 'string') {
    return false;
  }
  type = typeof type !== 'undefined' ? type : TYPE_PERSONAL_NUMBER | TYPE_COORDINATION_NUMBER;
  var n = number.replace(/\D/g, '');
  if (!(n.length === 12 || n.length === 10)) {
    return false;
  }

  var nums = [
      n.substr(0, (n.length === 10 ? 2 : 4)), // year
      n.substr(-8, 2), // month
      n.substr(-6, 2), // day
      n.substr(-4, 3), // number
      n.substr(-1, 1) // control number
    ],
    year = new Date()
    .getFullYear();
  if (nums[0].length === 2) {
    var y = year.toString();
    if (number.substr(-5, 1) === '+') {
      nums[0] = parseInt(y.substr(0, 2), 10) - (parseInt(y.substr(-2), 10) >= parseInt(nums[0], 10) ? 1 : 2) + nums[0];
    } else {
      nums[0] = (parseInt(y.substr(-2), 10) < parseInt(nums[0], 10) ? parseInt(y.substr(0, 2), 10) - 1 + nums[0] : y.substr(0, 2) + nums[0]);
    }
  }
  var ctrl = [parseInt(nums[0], 10), parseInt(nums[1], 10), parseInt(nums[2], 10)],
    mdim = {
      1: 31,
      2: 29,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31
    },
    lnum = nums.join('')
    .substr(2),
    cnum = nums.join(''),
    onum;
  if (~type & TYPE_PERSONAL_NUMBER && ctrl[2] <= 31) {
    return false;
  }
  if (~type & TYPE_COORDINATION_NUMBER && ctrl[2] >= 60) {
    return false;
  }

  if (ctrl[0] > year || ctrl[1] < 1 || ctrl[1] > 12 || !!(ctrl[2] < 1 || ctrl[2] > mdim[ctrl[1]]) && (ctrl[2] < 61 || ctrl[2] > mdim[ctrl[1]] + 60)) {
    return false;
  }

  if (format & ADD_SEPARATOR) {
    onum = (format & NBR_DIGITS_12 ? cnum.substr(0, 8) : cnum.substr(2, 6)) + (year - ctrl[0] >= 100 ? '+' : '-') + cnum.substr(-4);
  } else {
    onum = (format & NBR_DIGITS_10 ? cnum.substr(2) : cnum);
  }

  return is_luhn_valid(lnum) && onum;
}

function luhn_checksum(nbr) {
  var
    lookup = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9],
    len = nbr.length,
    bit = 1,
    sum = 0,
    val;

  while (len) {
    val = parseInt(nbr.charAt(--len), 10);
    sum += (bit ^= 1) ? lookup[val] : val;
  }

  return sum % 10;
}

function is_luhn_valid(nbr) {
  return luhn_checksum(nbr) === 0;
}

function calculate_luhn(nbr) {
  var sum = luhn_checksum(nbr + '0');
  return sum === 0 ? 0 : 10 - sum;
}

/**
 * Kontrollerar om ett svenskt organisationsnummer är giltigt i enlighet med
 * Lagen om identitetsbeteckning för juridiska personer (1974:174) och SKV 709.
 *
 * För att retunera organisationsnumret i ett visst format, kan en andra
 * valfri parameter anges. De format som stöds är:
 *
 *     ADD_SEPARATOR = Lägg till siljetecken (-)
 *     NBR_DIGITS_12 = 12 siffror, ÅÅÅÅMMDDNNNN
 *     NBR_DIGITS_10 = 10 siffror (standard), ÅÅMMDDNNNN
 *
 * @param {String} number Organisationsnumret som ska kontrolleras
 * @param {Int} format (ADD_SEPARATOR| (NBR_DIGITS_10,NBR_DIGITS_12))
 * @returns {String|Boolean} Returnerar personnumret eller 'false'
 */
function orgidnum(number, format) {
  if (typeof number !== 'string') {
    return false;
  }
    var n = number.replace(/\D/g, '');

    // 16NNNNNNNNNN används för lagring inom skatteverket
    if (n.length === 12 && parseInt(n.substr(0, 1)) !== 16) {
      if (parseInt(n.substr(0, 1)) !== 16) {
        return false;
      }
      n = n.substr(2);
    }

    if (n.length !== 10 || parseInt(n.substr(2, 1)) < 2) {
      return false;
    }

    return is_luhn_valid(n) && (format & NBR_DIGITS_12 ? '16' : '') + (format & ADD_SEPARATOR ? n.substr(0, 6) + '-' + n.substr(-4) : n);
  }
  /**
   * Kontrollerar om ett bankkortsnummer är giltigt i enlighet med ISO/IEC
   * 7812-1:2015.
   *
   * För att retunera bankkortsnumret i ett visst format, kan en andra valfri
   * parameter anges. De format som stöds är:
   *
   *     DEFAULT = Bankkortsnummer utan skiljetecken (standard), NNNNNNNNNNNNNNNN
   *     SPACE_SEPARATOR = Bankkortsnummer med ' ' som skiljetecken, NNNN NNNN NNNN NNNN
   *     DASH_SEPARATOR = Bankkortsnummer med '-' som skiljetecken, NNNN-NNNN-NNNN-NNNN
   *
   * @param {String} number Bankkortsnummer
   * @param {Int} format Önskat format (DEFAULT,SPACE_SEPARATOR,DASH_SEPARATOR)
   * @returns {String|Boolean} Bankkortsnumert eller 'false'
   */

function bankcardnum(number, format) {
  if (typeof number !== 'string') {
    return false;
  }
  var n = number.replace(/\D/g, ''),
    nsep, onum = '';
  if (n.length < 11 || n.length > 21) {
    return false;
  }

  if (format & SPACE_SEPARATOR || format & DASH_SEPARATOR) {
    nsep = (format & SPACE_SEPARATOR ? ' ' : '-');
    while (n.length > 0) {
      onum += n.substr(0, 4) + nsep;
      n = n.substr(4);
    }
    onum = onum.substring(0, onum.length - 1);
  } else {
    onum = n;
  }
  return is_luhn_valid(n) && onum;
}

/**
 * Kontrollerar om ett svenskt postnummer är giltigt i enlighet med
 * Svenska Postnummersystemet och SS 613401:2011.
 *
 * För att retunera postnumret i ett visst format, kan en andra valfri
 * parameter anges. De format som stöds är:
 *
 *     NUMERICAL_FORMAT = Numeriskt format (standard), NNNNN
 *     NATIONAL_FORMAT = Nationellt format, NNN NN
 *     INTERNATIONAL_FORMAT = Internationellt format, SE-NNN NN
 *
 * @param {String} number Postnummer
 * @param {Int} format Önskat format (NUMERICAL_FORMAT,NATIONAL_FORMAT,INTERNATIONAL_FORMAT)
 * @returns {String|Boolean} Postnumret eller 'false'
 */
function zipcode(number, format) {
  if (typeof number !== 'string') {
    return false;
  }
    var n = number.replace(/\D/g, ''),
      pfx = ['32', '48', '49', '99'],
      pn = parseInt(n, 10);
    if (n.length !== 5 || pn < 10000 || pn > 99000 || pfx.indexOf(n.substr(0, 2)) > -1) {
      return false;
    }
    return (format & NATIONAL_FORMAT ? n.substr(0, 3) + ' ' + n.substr(-2) : (format & INTERNATIONAL_FORMAT ? 'SE-' + n.substr(0, 3) + ' ' + n.substr(-2) : n));
  }
  /**
   * Kontrollerar om en e-postadress är giltig enligt mönstret *@*.*. Maximal
   * tillåten längd på en e-postadress är 254 tecken, i enlighet med RFC 3696.
   *
   * För att retunera e-postadressen i ett visst format, kan en andra valfri
   * parameter anges. De format som stöds är:
   *
   *     DEFAULT = Oförändrad, samma som inmatad e-postadress (standard)
   *     UPPERCASE = VERSAL E-POSTADRESS
   *     LOWERCASE = gemen e-postadress
   *
   * @param {String} email E-postadress
   * @param {Int} format Önskat format (DEFAULT,UPPERCASE,LOWERCASE)
   * @returns {String|Boolean} E-postadress eller 'false'
   */

function testEmail(email, format) {
  if (typeof email !== 'string') {
    return false;
  }
    var e = !!(/\S+@\S+\.\S+/.test(email) && email.indexOf('@') === email.lastIndexOf('@') && email.length < 255);
    email = (format & UPPERCASE ? email.toUpperCase() : (format & LOWERCASE ? email.toLowerCase() : email))
      .replace(/^\s+|\s+$/gm, '');
    return (e ? email : false);
  }
  /**
   * Kontrollerar
   *
   * Format:
   *
   *     DEFAULT = Oförändrad, samma som inmatad text (standard)
   *     UPPERCASE = VERSAL TEXT
   *     LOWERCASE = gemen text
   *
   * Typer:
   *
   *     VARCHAR - Alla tecken tillåts (standard)
   *     LETTER - Latinska bokstäver enligt ISO 8859-1
   *     LETTEREXT - Latinska bokstäver enligt ISO 8859-1 samt "&_-,.() "
   *     NUMBER - Numeriska tecken, 0-9
   *     NUMBEREXT - Numeriska tecken, 0-9 samt "%‰$£€¥+-,.() "
   *     ALPHANUM - Alfanumeriska tecken, aA-zZ, 0-9 samt '_'
   *
   * @param {String} text Textsträng
   * @param {String} type Valideringstyp
   * @param {Int} format Önskat format (DEFAULT,UPPERCASE,LOWERCASE)
   * @param {Int} min Minimal tillåten längd
   * @param {Int} max Maximal tillåten längd
   * @returns {String|Boolean} Returnerar textsträng eller 'false'
   */

function testText(text, type, format, min, max) {
  if (typeof text !== 'string') {
    return false;
  }
  type = type.toUpperCase(), min = (min > 0 ? min : 0), max = (max > 0 ? max : text.length);
  if (text.length < min || text.lenght > max) {
    return false;
  }
  if (type === 'LETTER' || type === 'LETTEREXT') {
    var ascii = [
      [
        [65, 90],
        [97, 122],
        [192, 214],
        [216, 246],
        [248, 255]
      ],
      [131, 138, 140, 142, 154, 156, 158, 159],
      [32, 38, 40, 41, 44, 45, 46, 95]
    ];
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i)
        .charCodeAt(),
        match = false;
      for (var j in ascii[0]) {
        if ((c >= ascii[0][j][0] && c <= ascii[0][j][1]) || ascii[1].indexOf(c) > -1) {
          match = true;
          break;
        }
      }
      if (!match && type === 'LETTEREXT' && ascii[2].indexOf(c) === -1) {
        return false;
      } else if (!match && type !== 'LETTEREXT') {
        return false;
      }
    }
  } else if (type === 'NUMBER' && /[^0-9]/i.test(text)) {
    return false;
  } else if (type === 'NUMBEREXT' && /[^0-9%‰$£€¥+\-,\.() ]/i.test(text)) {
    return false;
  } else if (type === 'ALPHANUM' && /[^\w]/i.test(text)) {
    return false;
  }
  return (text.length === 0 ? true : (format & LOWERCASE ? text.toLowerCase() : (format & UPPERCASE ? text.toUpperCase() : text)));
}

module.exports = {
  cellphonenum: cellphonenum,
  personalidnum: personalidnum,
  calculate_luhn: calculate_luhn,
  orgidnum: orgidnum,
  bankcardnum: bankcardnum,
  zipcode: zipcode,
  email: testEmail,
  text: testText,
  DEFAULT: DEFAULT,
  NUMERICAL_FORMAT: NUMERICAL_FORMAT,
  INTERNATIONAL_FORMAT: INTERNATIONAL_FORMAT,
  NATIONAL_FORMAT: NATIONAL_FORMAT,
  NBR_DIGITS_10: NBR_DIGITS_10,
  NBR_DIGITS_12: NBR_DIGITS_12,
  ADD_SEPARATOR: ADD_SEPARATOR,
  SPACE_SEPARATOR: SPACE_SEPARATOR,
  DASH_SEPARATOR: DASH_SEPARATOR,
  LOWERCASE: LOWERCASE,
  UPPERCASE: UPPERCASE,
  TYPE_PERSONAL_NUMBER: TYPE_PERSONAL_NUMBER,
  TYPE_COORDINATION_NUMBER: TYPE_COORDINATION_NUMBER
};

},{}]},{},[1])(1)
});