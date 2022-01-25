{ lib
, stdenv
, openssl
, kubectl
, buildahBuild
, dockerTools
}:
let
  name = "k8s-env-injector-init";
  baseImage = buildahBuild
    {
      name = "${name}-base";
      context = ./context;
      buildArgs = {
        fromDigest = "sha256:626ffe58f6e7566e00254b638eb7e0f3b11d4da9675088f4781a50ae288f3322";
      };
      outputHash =
        if stdenv.isx86_64 then
          "sha256-lYiGeQccC6iKEdhaWPjLTWr+8xe8Kh0+F+pgmQZkQpU=" else
          "sha256-kCPcb3meQUQ9/JD0KCBSpmH/ZztSohxy5qqas1FZHAw=";
    };
  initScript = ./init.sh;
in
dockerTools.buildImage {
  inherit name;
  fromImage = baseImage;
  config = {
    Env = [
      "ENTRYPOINT_SCRIPT=${initScript}"
      "PATH=${lib.makeBinPath [ openssl kubectl ]}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    ];
  };
}

