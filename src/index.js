// เรียก config และ Product Model
import './sheets.config';
import Product from './product.model';
import Friend from './friend.model';
import Expense from './expense.model';

// เป็นท่ามาตรฐานในการสร้าง JSON Output ของ Apps Script ครับ
const responseJSON = jsonObject => {
  return ContentService.createTextOutput(JSON.stringify(jsonObject)).setMimeType(
    ContentService.MimeType.JSON
  );
};

const doPost = e => {
  const sheetId = '10m1_3E7-977ackY3diMva7JPaMFIGOxfkltmNP_t_cc';
  // eslint-disable-next-line no-global-assign
  Logger = BetterLog.useSpreadsheet(sheetId);
  Tamotsu.initialize();
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
    if (friendObj.join === 'TRUE') {
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
    friendObj.join = 'TRUE';
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
  // ในการณีที่ไม่เจอ Intent ที่เขียนเอาไว้้
  return responseJSON({ fulfillmentText: 'ไม่เข้าใจค่ะ ลองใหม่อีกทีนะคะ' });
};

global.doPost = doPost;
