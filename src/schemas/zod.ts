import { z } from 'zod';

// 用户信息 Schema（用于 Agent 模式）
export const UserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').describe('用户的完整姓名'),
  age: z.number().int().min(0).max(150).describe('用户的年龄'),
  email: z.string().email('邮箱格式不正确').describe('用户的邮箱地址'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').describe('用户的手机号码'),
  address: z.object({
    city: z.string().min(1).describe('所在城市'),
    district: z.string().min(1).describe('所在区县'),
    street: z.string().min(1).describe('街道地址'),
  }).describe('用户的详细地址'),
  occupation: z.string().optional().describe('用户的职业'),
  hobbies: z.array(z.string()).describe('用户的兴趣爱好'),
}).describe('用户个人信息');

export type User = z.infer<typeof UserSchema>;

