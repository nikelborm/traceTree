TODO for me personally: check how it's different from `~/projects/tango-advisor/backend/src/tools/private/traceTree`

TODO: I recently discovered that special variable `arguments` of non anonymous functions (`function () {}`) has property callee that can be quite usefull in rendering traces. Maybe it would be cool to start using it in code somewhere

```ts
interface IArguments {
    [index: number]: any;
    length: number;
    callee: Function;
}
```

There is also something similar exists for python: [Eliot](https://github.com/itamarst/eliot)

This library allows devs to record smart traces of functions and beatifully render them. There is still a lot of work to be done, I hope I'll do it at some point. If you like this library, give it a star, it REALLY motivates me to work on this

![Screenshot from 2024-07-17 08-58-10](https://github.com/user-attachments/assets/c3d21f5b-612f-4763-8a73-75aa13fdf20f)
![Screenshot from 2024-07-17 08-57-21](https://github.com/user-attachments/assets/7848cc9d-5a00-489a-974a-99f0c37bb8cf)
