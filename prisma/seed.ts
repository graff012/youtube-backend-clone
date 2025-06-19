import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const admin_email = process.env.ADMIN_EMAIL;
const admin_password = process.env.ADMIN_PASSWORD;
const admin_role = process.env.ADMIN_ROLE;
const admin_username = process.env.ADMIN_USERNAME;
const admin_phone_number = process.env.ADMIN_PHONE_NUMBER;
const admin_first_name = process.env.ADMIN_FIRST_NAME;
const admin_last_name = process.env.ADMIN_LAST_NAME;
const logger = new Logger();

if (
  !admin_email ||
  !admin_password ||
  !admin_role ||
  !admin_username ||
  !admin_phone_number ||
  !admin_first_name ||
  !admin_last_name
) {
  throw new Error('Admin credentials not found');
}

const main = async () => {
  const hashedPassword = await bcrypt.hash(admin_password, 12);
  const findUser = await prisma.user.findUnique({
    where: {
      email: admin_email,
    },
  });

  if (!findUser) {
    await prisma.user.create({
      data: {
        username: admin_username,
        email: admin_email,
        password: hashedPassword,
        role: admin_role as Role,
        firstName: admin_first_name,
        lastName: admin_last_name,
        phoneNumber: admin_phone_number,
      },
    });
    logger.log('Admin created successfully');
  } else if (findUser.role !== admin_role) {
    await prisma.user.update({
      where: {
        email: admin_email,
      },
      data: {
        role: admin_role as Role,
      },
    });
    logger.log('Admin role updated successfully');
  } else {
    logger.log('Admin already exists');
  }
};

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
