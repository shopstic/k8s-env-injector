{ lib
, stdenv
, deno
, dumb-init
, kubectl
, writeTextFile
, buildahBuild
, dockerTools
, k8sEnvInjector
}:
let
  name = "k8s-env-injector";
  baseImage = buildahBuild
    {
      name = "${name}-base";
      context = ./context;
      buildArgs = {
        fromDigest = "sha256:626ffe58f6e7566e00254b638eb7e0f3b11d4da9675088f4781a50ae288f3322";
      };
      outputHash =
        if stdenv.isx86_64 then
          "sha256-5Z+KHbZRMe7YIvzHS1goB75Lgz1A6EqwUn++IYzd9O8=" else
          "sha256-VSjg6xX3SN6AFr7x0FHJcaiDtoct6iVGjcFHPLhSkwQ=";
    };
  entrypoint = writeTextFile {
    name = "entrypoint";
    executable = true;
    text = ''
      #!/usr/bin/env bash
      set -euo pipefail
      exec dumb-init -- ${k8sEnvInjector}/bin/k8s-env-injector
    '';
  };    
  baseImageWithDeps = dockerTools.buildImage {
    inherit name;
    fromImage = baseImage;
    config = {
      Env = [
        "PATH=${lib.makeBinPath [ deno dumb-init kubectl ]}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
      ];
    };
  };
in
dockerTools.buildLayeredImage {
  inherit name;
  fromImage = baseImageWithDeps;
  config = {
    Entrypoint = [ entrypoint ];
  };
}

