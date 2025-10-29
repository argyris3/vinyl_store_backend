// const { response } = require("express");
const adminModel = require('../models/adminModel');
const sellerModel = require('../models/sellerModel');
const { responseReturn } = require('../utils/response');
const cloudinary = require('cloudinary').v2
const formidable = require("formidable")
const bcrypt = require('bcrypt');
const { createToken } = require('../utils/tokenCreate');
const sellerCustomerModel = require('../models/chat/sellerCustomerModel')

class authControllers {
  admin_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const admin = await adminModel.findOne({ email }).select('+password');
      // console.log(admin);
      if (admin) {
        const match = await bcrypt.compare(password, admin.password);
        console.log(match);

        if (match) {
          const token = await createToken({
            id: admin.id,
            role: admin.role,
          });
          res.cookie('accessToken', token, {
            httpOnly: true,
            secure: true,
            samesite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
          })
          responseReturn(res, 200, { token, message: 'login ola kala' });
        } else {
          responseReturn(res, 404, { error: 'password wrong' });
        }
      } else {
        responseReturn(res, 404, { error: 'Email not found' });
      }
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };

  seller_login = async (req, res) => {
    const { email, password } = req.body;
    try {
      const seller = await sellerModel.findOne({ email }).select('+password');

      if (seller) {
        const match = await bcrypt.compare(password, seller.password);
        if (match) {
          const token = await createToken({
            id: seller.id,
            role: seller.role,
          });
          res.cookie('accessToken', token, {
            httpOnly: true,
            secure: true,
            samesite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
          })
          responseReturn(res, 200, { token, message: 'login ola kala' });
        } else {
          responseReturn(res, 404, { error: 'password wrong' });
        }
      } else {
        responseReturn(res, 404, { error: 'Email not found' });
      }
    } catch (error) {
      responseReturn(res, 500, { error: error.message });
    }
  };


  seller_register = async (req, res) => {
    const { email, name, password } = req.body
    try {
      const getUser = await sellerModel.findOne({ email })
      if (getUser) {
        responseReturn(res, 404, { error: "Email already exist" })
      } else {
        const seller = await sellerModel.create({
          name, email, password: await bcrypt.hash(password, 10),
          method: "menually",
          shopInfo: {}
        })
        await sellerCustomerModel.create({
          myId: seller.id
        })

        const token = await createToken({ id: seller.id, role: seller.role })
        res.cookie('accessToken', token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
        responseReturn(res, 201, { token, message: 'Register Success' })
      }
    } catch (error) {
      console.log(error);
      responseReturn(res, 500, { error: 'Internal Server Error' })
    }
  }

  getUser = async (req, res) => {
    const { id, role } = req;
    try {
      if (role === 'admin') {
        const user = await adminModel.findById(id);
        responseReturn(res, 200, { userInfo: user });
      } else {
        const seller = await sellerModel.findById(id)
        responseReturn(res, 200, { userInfo: seller })
      }
    } catch (error) {
      responseReturn(res, 500, { error: 'Internal Server Error' })
    }
  }

  profile_image_upload = async (req, res) => {
    const { id } = req
    const form = formidable({ multiples: true })
    form.parse(req, async (err, _, files) => {
      cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.api_key,
        api_secret: process.env.api_secret,
        secure: true
      })
      const { image } = files

      try {
        const result = await cloudinary.uploader.upload(image.filepath, { folder: 'profile' })
        if (result) {
          await sellerModel.findByIdAndUpdate(id, {
            image: result.url
          })
          const userInfo = await sellerModel.findById(id)
          responseReturn(res, 201, { message: 'Profile Image Upload Successfully', userInfo })
        } else {
          responseReturn(res, 404, { error: 'Image Upload Failed' })
        }
      } catch (error) {
        responseReturn(res, 500, { error: error.message })
      }






    })
  }

  // End Method 

  profile_info_add = async (req, res) => {
    const { division, district, shopName, sub_district } = req.body;
    const { id } = req;

    try {
      await sellerModel.findByIdAndUpdate(id, {
        shopInfo: {
          shopName,
          division,
          district,
          sub_district
        }
      })
      const userInfo = await sellerModel.findById(id)
      responseReturn(res, 201, { message: 'Profile info Add Successfully', userInfo })

    } catch (error) {
      responseReturn(res, 500, { error: error.message })
    }


  }
  // End Method 

  logout = async (req, res) => {
    try {
      res.cookie('accessToken', null, {
        expires: new Date(Date.now()),
        httpOnly: true
      })
      responseReturn(res, 200, { message: 'logout Success' })
    } catch (error) {
      responseReturn(res, 500, { error: error.message })
    }
  }
  // End Method 


  change_password = async (req, res) => {
    const { email, old_password, new_password } = req.body
    try {
      const user = await sellerModel.findOne({ email }).select("+password");
      if (!user) {
        return res.status(404).json({ message: "No User..." })
      }
      const isMatch = await bcrypt.compare(old_password, user.password)
      if (!isMatch) {
        return res.status(400).json({ message: "No password.." })
      }
      user.password = await bcrypt.hash(new_password, 10)
      await user.save()
      res.json({ message: "password changed ok.." })
    } catch (error) {
      return res.status(500).json({ message: "No No No" })
    }
  }
  //end method


};


module.exports = new authControllers();
