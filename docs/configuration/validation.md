---
description: Here are global validation options you can configure Eicrud with.
comments: true
---

```typescript
export class ValidationOptions{
  defaultMaxSize = 50;
  defaultMaxArLength = 20;
  defaultMaxItemsPerUser = 0;
};
```
```typescript title="eicrud.config.service.ts"
import { ValidationOptions } from '@eicrud/core/validation'

const validationOptions = new ValidationOptions();

@Injectable()
export class MyConfigService extends CrudConfigService {
    constructor(/* ... */) {
        super({ validationOptions, /* ... */})
    }
    //..
}
```

### defaultMaxSize
The default max size allowed for a DTO field stringified length. Overwritten by [$MaxSize decorators](../validation/definition.md).

### defaultMaxArLength
The default max length allowed for a DTO array field. Overwritten by [$MaxArLength decorators](../validation/definition.md).

### defaultMaxItemsPerUser
The default maximum number of entities a user can create in DB. Overwritten in each service security by [maxItemsPerUser](limits.md).
