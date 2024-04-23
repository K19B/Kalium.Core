@echo off
echo Kalium Post-build Script [BATCH]
echo Generate Prisma Client...
npx prisma generate && echo Building core... && npx tsup .\lib\*.ts .\main.ts .\loader.ts
