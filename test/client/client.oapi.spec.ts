import { Test, TestingModule } from '@nestjs/testing';
const path = require('path');
const fs = require('fs');
import {
  getModule,
  createNestApplication,
  readyApp,
  dropDatabases,
} from '../src/app.module';
import { SuperclientTest as ExportedSuperclientTest } from '../test_exports/superclient-ms/superclient-test/superclient-test.entity';
import { DragonFruit as ExportedDragonFruit } from '../test_exports/dragon-fruit/dragon-fruit.entity';
import { CrudController } from '@eicrud/core/crud/crud.controller';
import { MyUserService } from '../src/services/my-user/my-user.service';
import { CrudAuthService } from '@eicrud/core/authentication/auth.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';
import { UserProfile } from '../src/services/user-profile/user-profile.entity';
import {
  createAccountsAndProfiles,
  createMelons,
  createNewProfileTest,
  testMethod,
} from '../test.utils';
import { UserProfileService as MyProfileService } from '../src/services/user-profile/user-profile.service';
import { PingCmdDto as ExportedPingCmdDto } from '../test_exports/superclient-ms/superclient-test/cmds/ping_cmd/ping_cmd.dto';
import { Melon } from '../src/services/melon/melon.entity';
import { TestUser } from '../test.utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '@eicrud/core/config/crud.config.service';
import { CrudAuthGuard } from '@eicrud/core/authentication/auth.guard';
import { ClientConfig, MemoryStorage } from '@eicrud/client/CrudClient';
import { ICrudOptions } from '../../shared/interfaces';
import * as services from '../oapi-client/services.gen';

const testAdminCreds = {
  email: 'admin@testmail.com',
  password: 'testpassword',
};

const users: Record<string, TestUser> = {
  'Jon Doe': {
    email: 'jon.doe@test.com',
    role: 'super_admin',
    bio: 'I am a cool guy.',
    melons: 5,
    dragonfruits: 3,
  },
};

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let authGuard: CrudAuthGuard;
  let profileService: MyProfileService;
  let app: NestFastifyApplication;

  let entityManager: EntityManager;

  let crudConfig: CrudConfigService;
  const baseName = path.basename(__filename);

  const port = 2997;

  beforeAll(async () => {
    const module = getModule(baseName);
    const moduleRef: TestingModule =
      await Test.createTestingModule(module).compile();

    await dropDatabases(moduleRef);

    app = createNestApplication(moduleRef);

    await app.init();
    await readyApp(app);

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);
    authGuard = authService._authGuard;
    profileService = app.get<MyProfileService>(MyProfileService);
    entityManager = app.get<EntityManager>(EntityManager);
    crudConfig = app.get<CrudConfigService>(CRUD_CONFIG_KEY, { strict: false });

    crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs = 0;
    crudConfig.watchTrafficOptions.ddosProtection = false;

    await createAccountsAndProfiles(users, userService, crudConfig, {
      testAdminCreds,
    });

    await app.listen(port);
  });

  services.client.setConfig({
    baseURL: `http://localhost:${port}`,
  });
  it(
    'should run cmds with oapi client',
    async () => {
      const user = users['Jon Doe'];

      let res = await services.patchCrudSUserProfileCmdTestCmd({
        body: {
          returnMessage: "I'm a guest!",
        },
        query: {
          options: JSON.stringify({
            jwtCookie: true,
          }) as any,
        },
      });
      expect(res.data).toBe("I'M A GUEST!");

      res = await services.patchCrudSMyUserCmdLogin({
        body: {
          email: user.email,
          password: testAdminCreds.password,
        },
      });
      expect(res.data.userId).toEqual(user.id?.toString());

      const authorization = 'Bearer ' + res.data.accessToken;

      res = await services.patchCrudSUserProfileCmdTestCmd({
        body: {
          returnMessage: "I'm a guest!",
        },
        query: {
          options: JSON.stringify({
            jwtCookie: true,
          }) as any,
        },
        headers: {
          authorization: authorization,
        },
      });

      expect(res.error).toBeDefined();
      expect(res.error['statusCode']).toBe(403);
      res = await services.postCrudSUserProfileCmdTestCmd({
        body: {
          returnMessage: 'Hello world!',
        },
        query: {
          options: JSON.stringify({
            jwtCookie: true,
          }) as any,
        },
        headers: {
          authorization: authorization,
        },
      });
      expect(res.data).toBe('HELLO WORLD!');
    },
    6000 * 100,
  );
});
