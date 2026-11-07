import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GreeterModule", (m) => {
  const name = m.getParameter("name", "World");
  const greeter = m.contract("Greeter", [name]);

  return { greeter };
});
