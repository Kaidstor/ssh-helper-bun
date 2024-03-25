import db from "./db";
import { Tmux } from "./tmux";

async function main() {
  const arg2 = process.argv.at(2);

  if (arg2 == "ls") {
    const ls = Tmux.ls();

    if (!ls.length) {
      console.log("Нет запущенных сессий");
    } else {
      console.log("Список запущенных сессий:");
      console.log(ls.map((l, i) => `${i + 1}) ${l}`).join("\n"));
    }
    return;
  }

  if (arg2 == "add") {
    await Tmux.add()
    return;
  }

  if (arg2 == "hosts") {
    const hosts = Tmux.hosts();

    if (!hosts.length) return;

    console.log("Список узлов:");
    console.log(hosts.map((h, i) => `${i + 1}) ${h}`).join("\n"));
    return;
  }

  if (arg2 == "сlose") {
    const host = process.argv.at(3);
    if (!host) {
      throw new Error("Не указан host");
    }

    Tmux.closeSession(host);
    return;
  }

  const host = arg2;
  let port = process.argv.at(3) as string | number;

  const isLocal = process.argv.at(4) !== "-R";

  if (!host || !port) {
    throw new Error("Host and port are required");
  }

  if (isNaN(+port)) {
    port = db.data.ports[port];
    if (!port) {
      console.log(port);
      throw new Error("Port must be number, name not found in db.ports");
    }
  }

  await Tmux.tunnel(host, port, isLocal);
}

main();
