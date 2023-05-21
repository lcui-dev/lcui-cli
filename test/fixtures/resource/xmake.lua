add_rules("mode.debug", "mode.release")

target("app")
    set_kind("binary")
    add_files("src/**.c")
