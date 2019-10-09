// เรียก config และ Product Model
import './sheets.config';
import Product from './product.model';
import Friend from './friend.model';
import Expense from './expense.model';
import Total from './total.model';

// เป็นท่ามาตรฐานในการสร้าง JSON Output ของ Apps Script ครับ
const responseJSON = jsonObject => {
  return ContentService.createTextOutput(JSON.stringify(jsonObject)).setMimeType(
    ContentService.MimeType.JSON
  );
};

const helloWorld = () => {
  const sheetId = '10m1_3E7-977ackY3diMva7JPaMFIGOxfkltmNP_t_cc';
  // eslint-disable-next-line no-global-assign
  Logger = BetterLog.useSpreadsheet(sheetId);
  Tamotsu.initialize();
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
    const response = { fulfillmentText: `${product.name} ราคา £${product.price} ค่ะ` };

    // ส่งคำตอบกลับไป
    return responseJSON(response);
  }
  if (intent.displayName === `Add Friend to the trip`) {
    const friendName = parameters.Friends;
    const friendObj = Friend.where({ name: friendName }).first();
    if (friendObj.isInParty === '1') {
      const response = {
        fulfillmentText: 'รายชื่อนี้อยู่ในปาร์ตี้แล้ว',
        fulfillmentMessages: [
          {
            facebook: {
              type: 'text',
              text: 'รายชื่อนี้อยู่ในปาร์ตี้แล้ว'
            }
          }
        ]
      }; // ส่งคำตอบกลับไป
      return responseJSON(response);
    }
    friendObj.isInParty = '1';
    friendObj.amount = '';
    friendObj.net = '';
    friendObj.save();

    const response = {
      fulfillmentText: `ขอต้อนรับ ${friendName} เข้าสู่ปาร์ตี้`,
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: `ขอต้อนรับ ${friendName} เข้าสู่ปาร์ตี้`
          }
        }
      ]
    };

    // ส่งคำตอบกลับไป
    return responseJSON(response);
  }
  if (intent.displayName === `Add Transaction`) {
    const friendName = parameters.Friends;
    Expense.create({
      name: friendName,
      description: parameters.Description,
      amount: parameters.number,
      datetime: new Date()
    });
    const response = {
      fulfillmentText: `เพิ่มรายการ ${parameters.number} บาท สำเร็จ`,
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: `เพิ่มรายการ ${parameters.number} บาท สำเร็จ`
          }
        }
      ]
    };
    return responseJSON(response);
  }
  if (intent.displayName === `Clear Trip`) {
    // Clear expense
    while (1) {
      if (Expense.last() != null) {
        Expense.last().destroy();
      } else {
        break;
      }
    }

    // Clear Friend
    const joinList = Friend.where({ isInParty: 'true' }).first();
    Logger.log(joinList);
    Expense.create({
      name: 'Sterk',
      description: `${joinList.name}${joinList.isInParty}`
    });

    const response = {
      fulfillmentText: `ล้างรายการสำเร็จ`,
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: `ล้างรายการสำเร็จ`
          }
        }
      ]
    };
    return responseJSON(response);
  }

  if (intent.displayName === `Delete friend from the trip`) {
    const friendName = parameters.Friends;
    const friendObj = Friend.where({ name: friendName }).first();
    friendObj.isInParty = '';
    friendObj.amount = '';
    friendObj.net = '';
    friendObj.save();

    const response = {
      fulfillmentText: `เตะบัก ${friendName} เรียบร้อยแล้ว`,
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: `เตะบัก ${friendName} เรียบร้อยแล้ว`
          }
        }
      ]
    };
    return responseJSON(response);
  }

  if (intent.displayName === `Get Status`) {
    const friendObj = Friend.where({ isInParty: 1 }).all();
    let status = 'แต่ละคนออกเงินไปดังนี้\n';
    let i = 0;
    for (; i < Object.keys(friendObj).length; ) {
      status += `${friendObj[i].name} ${friendObj[i].amount} บาท\n`;
      i += 1;
    }
    const tripPrice = Total.where({ name: `Total` }).first();
    const pricePerPerson = Total.where({ name: `pps` }).first();
    status += `\n\n##ยอดรวม## \n${tripPrice.amount}บาท\n\n##คิดเป็นต่อคนคือ##\n${pricePerPerson.amount}บาท\n\n##หักหนี้แล้วเท่ากับว่า## \n\n`;
    i = 0;
    for (; i < Object.keys(friendObj).length; ) {
      if (friendObj[i].net < 0) {
        status += `${friendObj[i].name} ต้องจ่ายเพิ่ม\n${friendObj[i].net} บาท\n\n`;
      } else {
        status += `${friendObj[i].name} ต้องได้คืน\n${friendObj[i].net} บาท\n\n`;
      }
      i += 1;
    }

    const response = {
      // fulfillmentText: `เตะบัก ${friendObj.amount} ${friendObj.name}${friendObj.join}${friendObj.net}เรียบร้อยแล้ว`,
      fulfillmentText: `${status}`,
      fulfillmentMessages: [
        {
          facebook: {
            type: 'text',
            text: `${status}`
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
