import * as Yup from "yup";

export const RegistrationSchema = Yup.object({
  firstName: Yup.string()
    .matches(/^[A-Za-z]+$/, "First name must contain only alphabets") // Only alphabets allowed
    .min(2)
    .max(25)
    .required("Please enter your first name"),
    
  lastName: Yup.string()
    .matches(/^[A-Za-z]+$/, "Last name must contain only alphabets") // Only alphabets allowed
    .min(2)
    .max(25)
    .required("Please enter your last name"),
  
  Company: Yup.string()
    .min(2)
    .max(25)
    .required("Please enter your Company name"),
    
  email: Yup.string()
    .email()
    .required("Please enter your email"),
    
  password: Yup.string()
    .min(8)
    .required("Please enter your password"),
    
  confirmPassword: Yup.string()
    .required()
    .oneOf([Yup.ref("password"), null], "Password must match"),
});
