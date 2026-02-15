WIDGETS_DIR := $(HOME)/Library/Application Support/Übersicht/widgets
BUILD := build/stack.jsx

.PHONY: deploy build clean

default: clean deploy

build:
	@mkdir -p build
	@{ \
		sed '/\/\/ {{WIDGETS}}/,$$d' stack.jsx; \
		cat widgets/*.jsx; \
		sed '1,/\/\/ {{WIDGETS}}/d' stack.jsx; \
	} > $(BUILD)

deploy: build
	@cp $(BUILD) "$(WIDGETS_DIR)/stack.jsx"
	@osascript -e 'tell application id "tracesOf.Uebersicht" to refresh'
	@echo "deployed"

cd:
	@echo "$(WIDGETS_DIR)"

clean:
	@rm -rf build
