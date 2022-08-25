{ lib
, stdenv
, deno
, dumb-init
, bash
, kubectl
, dockerTools
, k8sEnvInjector
}:
let
  name = "k8s-env-injector";
  user = "app";
  uid = 1001;
  gid = uid;
  image = dockerTools.buildLayeredImage {
    name = name;
    contents = [ deno dumb-init kubectl bash ];
    config = {
      Entrypoint = [
        "dumb-init"
        "--"
        "${k8sEnvInjector}/bin/k8s-env-injector"
      ];
    };
    fakeRootCommands = ''
      mkdir ./etc

      echo "root:!x:::::::" > ./etc/shadow
      echo "${user}:!:::::::" >> ./etc/shadow

      echo "root:x:0:0::/root:${bash}/bin/bash" > ./etc/passwd
      echo "${user}:x:${toString uid}:${toString gid}::/home/${user}:" >> ./etc/passwd

      echo "root:x:0:" > ./etc/group
      echo "${user}:x:${toString gid}:" >> ./etc/group

      echo "root:x::" > ./etc/gshadow
      echo "${user}:x::" >> ./etc/gshadow

      mkdir -p ./home/${user}
      chown ${toString uid} ./home/${user}
    '';
  };
in
image
