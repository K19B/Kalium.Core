echo -e "Kalium Post-build Script [SH]"
echo -e "Generate Prisma Client..."
npx prisma generate
echo -e "Building core..."
npx tsup ./lib/*.ts ./main.ts ./loader.ts
