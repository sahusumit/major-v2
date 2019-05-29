var mongoose = require('mongoose')
var bcrypt = require('bcrypt-nodejs');

var schema = mongoose.Schema;

var userSchema = new schema({
    username:{
        type:String,
        required:true,
    },
    password: {
        type: String,
        required: true,
    },
    fullname: String,
    mobileno: Number,
    address: String,
    dateofbirth:Date,
    sex:String,
    emergencycontact:Number,
    bloodgroup:String,
    allergies:String,
    bmi:String,
    accidents:String,
    history:String,
    diseases:[{
        title:String,
        healthissue:String,
        response:String,
        doctor:String,
        medications:String,
        hospital:String,
        tests:String,
        treatment:String,
        status:String
    }]
})

userSchema.methods.hashPassword = function (password) {
    return bcrypt.hashSync(password,bcrypt.genSaltSync(10))
}

userSchema.methods.comparePassword = function (password,hash) {
    return bcrypt.compareSync(password,hash)
}

module.exports = mongoose.model('User',userSchema,'users');