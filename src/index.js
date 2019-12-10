// เรียก config และ Product Model
import './sheets.config';
import Product from './product.model';
// import Friend from './friend.model';
// import Expense from './expense.model';
// import Total from './total.model';

const friends = SpreadsheetApp.getActive().getSheetByName('Friends');
const expense = SpreadsheetApp.getActive().getSheetByName('Expense');
const sheetTotal = SpreadsheetApp.getActive().getSheetByName('Total');
const sheetSummary = SpreadsheetApp.getActive().getSheetByName('Summary');
function generateReponse(msg) {
  const response = {
    fulfillmentText: msg,
    fulfillmentMessages: [
      {
        text: {
          text: [msg]
        }
      },
      {
        card: {
          title: msg,
          subtitle: `ต้องการทำอะไรต่อดีคะ`,
          buttons: [
            {
              text: 'ดูคำสั่งต่างๆ'
            }
          ]
        },
        platform: 'FACEBOOK'
      },
      {
        card: {
          title: msg,
          subtitle: `ต้องการทำอะไรต่อดีคะ`,
          imageUri: 'https://i.ibb.co/RpyHXSJ/Screen-Shot-2562-10-12-at-00-53-21.png',
          buttons: [
            {
              text: 'ดูคำสั่งต่างๆ'
            }
          ]
        },
        platform: 'LINE'
      }
    ]
  };
  return response;
}

function findFriend(name) {
  let i = 2;
  for (; i <= 48; ) {
    if (friends.getRange(i, 2).getValue() === name) {
      break;
    }
    i += 1;
  }
  return i;
}

function isInParty(i) {
  return friends.getRange(i, 4).getValue() === 1;
}
function setParty(index, value) {
  friends.getRange(index, 4).setValue(value);
}
// เป็นท่ามาตรฐานในการสร้าง JSON Output ของ Apps Script
const responseJSON = jsonObject => {
  return ContentService.createTextOutput(JSON.stringify(jsonObject)).setMimeType(
    ContentService.MimeType.JSON
  );
};

const helloWorld = () => {
  Logger.log('Hello World');
};

global.helloWorld = helloWorld;

const doPost = e => {
  const data = JSON.parse(e.postData.contents);
  // ตรวจสอบ request ว่ามีข้อมูลที่ต้องการไหม
  if (!data.queryResult) {
    return responseJSON({ fulfillmentText: 'หนูว่ามีปัญหาแล้วอันนี้' });
  }
  const { parameters, intent } = data.queryResult;
  // ตรวจสอบว่า intent เป็นการถามราคาหรือเปล่า (เผื่อมีหลาย intent)
  if (intent.displayName === 'Ask for the price') {
    const productName = parameters.Product;

    // query เอา product ที่มี name ตรงกับที่ dialogflow ส่งมาให้
    const product = Product.where({ name: productName }).first();

    // สร้าง fulfillment text เพื่อตอบกลับไปที่ dialoflow
    const response = { fulfillmentText: `${product.name} ราคา ${product.price}บาท ค่ะ` };

    // ส่งคำตอบกลับไป
    return responseJSON(response);
  }
  if (intent.displayName === `Add Friend to the trip`) {
    const friendName = parameters.Friends;
    const index = findFriend(friendName);

    if (isInParty(index)) {
      const response = generateReponse(`รายชื่อนี้อยู่ในปาร์ตี้แล้วค่ะ`);
      // ส่งคำตอบกลับไป
      return responseJSON(response);
    }
    setParty(index, 1);

    const response = generateReponse(`ขอต้อนรับ ${friendName} เข้าสู่ปาร์ตี้`);

    // ส่งคำตอบกลับไป
    return responseJSON(response);
  }
  if (intent.displayName === `Add Transaction`) {
    const friendName = parameters.Friends;
    const index = findFriend(friendName);
    if (isInParty(index)) {
      expense.appendRow([``, friendName, parameters.Description, parameters.number, new Date()]);
      sheetSummary.appendRow([`=getSummary()`]);
      const response = generateReponse(`เพิ่มรายการ ${parameters.number} บาท สำเร็จ`);
      return responseJSON(response);
    }
    const response = generateReponse(`เพื่อนคนนี้ไม่อยู่ในปาร์ตี้กรุณาเพิ่มเพื่อนก่อนค่ะ`);
    return responseJSON(response);
  }

  if (intent.displayName === `Clear Trip`) {
    expense.clear();
    expense.appendRow(['#', `name`, `description`, `amount`, `date`]);
    expense.deleteRow(1);
    sheetSummary.clear();
    for (let i = 2; i <= 48; ) {
      setParty(i, '');
      i += 1;
    }

    const response = generateReponse(`ล้างรายการสำเร็จเรียบร้อยแล้วค่าาาา`);
    return responseJSON(response);
  }

  if (intent.displayName === `Delete friend from the trip`) {
    const friendName = parameters.Friends;
    const index = findFriend(friendName);
    setParty(index, '');

    const response = generateReponse(`เตะบัก ${friendName} เรียบร้อยแล้วค่ะ`);
    return responseJSON(response);
  }

  if (intent.displayName === `Get Status`) {
    const response = {
      fulfillmentText: sheetSummary.getRange(sheetSummary.getLastRow(), 1).getValue(),
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: sheetSummary.getRange(sheetSummary.getLastRow(), 1).getValue()
          }
        }
      ]
    };
    return responseJSON(response);
  }
  // ในการณีที่ไม่เจอ Intent ที่เขียนเอาไว้้
  return responseJSON({ fulfillmentText: 'ไม่เข้าใจค่ะ ลองใหม่อีกทีนะคะ' });
};

global.doPost = doPost;

const getSummary = () => {
  // const data = range.getValue();
  let spend = `แต่ละคนจ่ายเงินดังนี้\n\n`;
  for (let i = 2; i <= 48; ) {
    if (isInParty(i)) {
      spend += `${friends.getRange(i, 2).getValue()} ออกเงินไป ${friends
        .getRange(i, 3)
        .getValue()}THB\n`;
    }
    i += 1;
  }
  spend += `\n\nรวมเป็นเงิน ${sheetTotal.getRange(2, 3).getValue()}THB\n`;
  spend += `เฉลี่ยต่อคน ${sheetTotal.getRange(3, 3).getValue()}THB\n\n`;
  spend += `====สรุป====\n\n`;
  for (let i = 2; i <= 48; ) {
    if (isInParty(i)) {
      if (friends.getRange(i, 5).getValue() > 0) {
        spend += `${friends.getRange(i, 2).getValue()} ได้เงินคืน ${friends
          .getRange(i, 5)
          .getValue()}THB \n promptpay: ${friends.getRange(i, 6).getValue()}\n\n`;
      } else {
        spend += `${friends.getRange(i, 2).getValue()} จ่ายเพิ่มอีก ${friends
          .getRange(i, 5)
          .getValue()}THB\n`;
      }
    }
    i += 1;
  }

  Logger.log(spend);
  return spend;
};
global.getSummary = getSummary;
